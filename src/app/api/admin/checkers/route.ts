import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/admin";
import { buyCheckers, crgConfig, lookupOrder, REFERENCE, type CheckerType } from "@/lib/crg";
import { query } from "@/lib/db";
import { CHECKERS } from "@/lib/site";

const n = (v: unknown) => Number(v ?? 0);

/** Status, selling prices and recent dashboard sales (order details only - PINs are never stored). */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const recent = await query(
    "SELECT reference, type, quantity, unit_price, total, mode, note, created_at FROM checker_orders ORDER BY created_at DESC LIMIT 25",
  );
  return Response.json({
    ...crgConfig(),
    shortCode: { ussd: CHECKERS.ussd, vendorCode: CHECKERS.vendorCode, prices: CHECKERS.prices },
    recent: recent.map((r) => ({
      reference: String(r.reference),
      type: String(r.type),
      quantity: n(r.quantity),
      unitPrice: n(r.unit_price),
      total: n(r.total),
      mode: String(r.mode),
      note: r.note ? String(r.note) : null,
      createdAt: n(r.created_at),
    })),
  });
}

/**
 * { action: "buy", type: "WAEC" | "BECE", quantity, reference?, note?, confirmLive? } - charges the wallet
 * { action: "lookup", reference } - fetches a past order and its PINs again
 */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);

  if (body?.action === "lookup") {
    const reference = String(body?.reference ?? "").trim();
    if (!REFERENCE.test(reference)) return Response.json({ error: "Enter a valid reference (4-64 letters, numbers, . _ : or -)." }, { status: 400 });
    const result = await lookupOrder(reference);
    return result.ok ? Response.json({ order: result.data }) : Response.json({ error: result.error }, { status: result.status || 502 });
  }

  if (body?.action === "buy") {
    const type = String(body?.type ?? "") as CheckerType;
    const quantity = Number(body?.quantity);
    if (type !== "WAEC" && type !== "BECE") return Response.json({ error: "Choose WAEC (WASSCE) or BECE." }, { status: 400 });
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return Response.json({ error: "Quantity must be 1 to 100." }, { status: 400 });

    const { configured, mode } = crgConfig();
    if (!configured) return Response.json({ error: "Set CRG_KEY and CRG_SECRET in the site's environment first." }, { status: 400 });
    // Live orders spend real money from the partner wallet.
    if (mode === "live" && body?.confirmLive !== true) return Response.json({ error: "Confirm that this live order will charge your wallet." }, { status: 400 });

    const reference = String(body?.reference ?? "").trim() || `cc-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(4).toString("hex")}`;
    if (!REFERENCE.test(reference)) return Response.json({ error: "References are 4-64 letters, numbers, . _ : or -." }, { status: 400 });
    const note = body?.note ? String(body.note).slice(0, 200) : null;

    const result = await buyCheckers(type, quantity, reference);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status || 502 });

    const o = result.data;
    await query(
      `INSERT INTO checker_orders (reference, type, quantity, unit_price, total, mode, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (reference) DO NOTHING`,
      [o.reference, o.type, o.quantity, o.unit_price ?? null, o.total ?? null, o.mode, note, Date.now()],
    );
    return Response.json({ order: o }, { status: result.status });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
