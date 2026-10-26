import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";

// Saved data (grades, shortlists, tracker) for signed-in users. Guests keep it in the browser only.
const ALLOWED_KEYS = /^uc:[a-z0-9-]{1,40}$/;
const MAX_VALUE = 200_000;

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const rows = await query("SELECT key, value, updated_at FROM user_data WHERE user_id = ?", [user.id]);
  const data: Record<string, { v: unknown; t: number }> = {};
  for (const row of rows) data[String(row.key)] = { v: JSON.parse(String(row.value)), t: Number(row.updated_at) };
  return Response.json({ data });
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const key = String(body?.key ?? "");
  const value = JSON.stringify(body?.value ?? null);
  const t = Number(body?.t) || Date.now();
  if (!ALLOWED_KEYS.test(key) || value.length > MAX_VALUE) return Response.json({ error: "Invalid data" }, { status: 400 });
  await query(
    `INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
     WHERE excluded.updated_at >= user_data.updated_at`,
    [user.id, key, value, t],
  );
  return Response.json({ ok: true });
}
