import { createHash } from "node:crypto";
import { clientKey, rateLimited } from "@/lib/auth";
import { query } from "@/lib/db";
import { EVENTS, type EventName } from "@/lib/telemetry-events";

const SALT = process.env.STATS_SALT ?? "campuscompass";

/**
 * Anonymous statistics endpoint. Stores the event name, page path and a few whitelisted fields.
 * Visitors are counted with a hash of (day, IP, browser) that changes every day and can't be
 * reversed, so no one can be followed across days and no IP address is stored.
 */
export async function POST(req: Request) {
  const who = clientKey(req);
  if (rateLimited(`t:${who}`, 300, 60 * 60_000)) return new Response(null, { status: 204 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "") as EventName;
  if (!(name in EVENTS)) return new Response(null, { status: 204 });

  const path = typeof body?.path === "string" ? body.path.slice(0, 200).split("?")[0] : null;
  const allowed: readonly string[] = EVENTS[name];
  const props: Record<string, string | number> = {};
  for (const key of allowed) {
    const v = body?.props?.[key];
    if (typeof v === "number" && Number.isFinite(v)) props[key] = v;
    else if (typeof v === "string") props[key] = v.slice(0, 40);
  }

  const day = new Date().toISOString().slice(0, 10);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const ua = req.headers.get("user-agent") ?? "";
  const visitor = createHash("sha256").update(`${SALT}|${day}|${ip}|${ua}`).digest("hex").slice(0, 16);

  try {
    await query("INSERT INTO events (name, path, day, visitor, props, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
      name,
      path,
      day,
      visitor,
      Object.keys(props).length ? JSON.stringify(props) : null,
      Date.now(),
    ]);
  } catch {
    // Never let statistics break the visitor's page.
  }
  return new Response(null, { status: 204 });
}
