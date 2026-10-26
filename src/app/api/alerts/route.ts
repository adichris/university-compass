import { clientKey, rateLimited } from "@/lib/auth";
import { query } from "@/lib/db";

const TOPICS = new Set(["results", "admissions", "scholarships"]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Optional email alerts (results release, admission forms, scholarship deadlines). */
export async function POST(req: Request) {
  if (rateLimited(`alerts:${clientKey(req)}`, 5)) return Response.json({ error: "Too many requests" }, { status: 429 });
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const topics = (Array.isArray(body?.topics) ? body.topics : []).map(String).filter((t: string) => TOPICS.has(t));
  if (!EMAIL.test(email) || topics.length === 0) {
    return Response.json({ error: "Enter a valid email and pick at least one alert." }, { status: 400 });
  }
  await query(
    `INSERT INTO alerts (email, topics, created_at) VALUES (?, ?, ?)
     ON CONFLICT (email) DO UPDATE SET topics = excluded.topics`,
    [email, topics.join(","), Date.now()],
  );
  return Response.json({ ok: true });
}
