import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";

/**
 * CheckResultGH Partner API client (sell WAEC/BECE result checkers from the partner wallet).
 * Set CRG_KEY (crg_live_… or crg_test_…) and CRG_SECRET (crs_…) in the server environment only.
 *
 * Every order charges the partner wallet immediately, so this must only be called after the
 * customer has paid (or from the admin dashboard) - never directly from a public request.
 */
const BASE = process.env.CRG_BASE_URL ?? "https://tmzdskocjjcnzmcklbnz.supabase.co/functions/v1/partner-api";

export type CheckerType = "WAEC" | "BECE";

export interface CheckerItem {
  serial: string;
  pin: string;
}

export interface CheckerOrder {
  order_id: string;
  reference: string;
  type: CheckerType;
  quantity: number;
  unit_price: number;
  total: number;
  balance?: number;
  mode: "live" | "test";
  status?: string;
  replay?: boolean;
  created_at: string;
  items: CheckerItem[];
}

export type CrgResult<T> = { ok: true; data: T; status: number } | { ok: false; error: string; status: number };

export function crgConfig() {
  const key = process.env.CRG_KEY ?? "";
  const secret = process.env.CRG_SECRET ?? "";
  const mode = key.startsWith("crg_live_") ? "live" : key.startsWith("crg_test_") ? "test" : null;
  return { configured: Boolean(key && secret && mode), mode };
}

/** Signing string from the docs: timestamp, nonce, METHOD, path (no query) and sha256(body), joined by "\n". */
export function signRequest(secret: string, ts: string, nonce: string, method: string, path: string, rawBody: string): string {
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");
  return createHmac("sha256", secret).update([ts, nonce, method.toUpperCase(), path, bodyHash].join("\n")).digest("hex");
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<CrgResult<T>> {
  const key = process.env.CRG_KEY ?? "";
  const secret = process.env.CRG_SECRET ?? "";
  if (!crgConfig().configured) return { ok: false, error: "CheckResultGH API keys are not set on the server (CRG_KEY, CRG_SECRET).", status: 0 };

  // Sign exactly the bytes that are sent.
  const raw = body === undefined ? "" : JSON.stringify(body);
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");
  const signature = signRequest(secret, ts, nonce, method, path, raw);

  try {
    const res = await fetch(BASE + path, {
      method,
      body: raw || undefined,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
        "X-Timestamp": ts,
        "X-Nonce": nonce,
        "X-Signature": signature,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.success) return { ok: true, data: json.data as T, status: res.status };
    const message = json?.error?.message ?? json?.error ?? json?.message ?? `CheckResultGH returned HTTP ${res.status}`;
    return { ok: false, error: String(message), status: res.status };
  } catch (err) {
    return { ok: false, error: `Could not reach CheckResultGH: ${err instanceof Error ? err.message : String(err)}`, status: 0 };
  }
}

export const REFERENCE = /^[A-Za-z0-9._:-]{4,64}$/;

/** Buy checkers. Re-using a reference returns the original order (safe retries), with replay: true. */
export function buyCheckers(type: CheckerType, quantity: number, reference: string) {
  return call<CheckerOrder>("POST", "/v1/orders", { type, quantity, reference });
}

/** Look up a past order (and its PINs) by your reference. */
export function lookupOrder(reference: string) {
  return call<CheckerOrder>("GET", `/v1/orders/${encodeURIComponent(reference)}`);
}
