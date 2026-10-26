import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";

const n = (v: unknown) => Number(v ?? 0);

/** Aggregated statistics for the admin dashboard. Postgres returns counts as strings, hence n(). */
export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);

  const [daily, totals, pages, props, counts] = await Promise.all([
    query(
      `SELECT day,
              SUM(CASE WHEN name = 'pageview' THEN 1 ELSE 0 END) AS views,
              COUNT(DISTINCT visitor) AS visitors,
              SUM(CASE WHEN name = 'check_results' THEN 1 ELSE 0 END) AS checks
       FROM events WHERE day >= ? GROUP BY day ORDER BY day`,
      [since],
    ),
    query("SELECT name, COUNT(*) AS n FROM events WHERE day >= ? GROUP BY name", [since]),
    query(
      `SELECT path, COUNT(*) AS n, COUNT(DISTINCT visitor) AS visitors
       FROM events WHERE name = 'pageview' AND day >= ? GROUP BY path ORDER BY n DESC LIMIT 15`,
      [since],
    ),
    query(
      `SELECT name, props, COUNT(*) AS n FROM events
       WHERE props IS NOT NULL AND day >= ? GROUP BY name, props ORDER BY n DESC LIMIT 60`,
      [since],
    ),
    Promise.all([
      query("SELECT COUNT(*) AS n FROM users"),
      query("SELECT COUNT(*) AS n FROM outcomes"),
      query("SELECT COUNT(*) AS n FROM alerts"),
    ]),
  ]);

  return Response.json({
    days,
    since,
    daily: daily.map((r) => ({ day: String(r.day), views: n(r.views), visitors: n(r.visitors), checks: n(r.checks) })),
    totals: Object.fromEntries(totals.map((r) => [String(r.name), n(r.n)])),
    pages: pages.map((r) => ({ path: String(r.path ?? ""), views: n(r.n), visitors: n(r.visitors) })),
    breakdown: props.map((r) => ({ name: String(r.name), props: JSON.parse(String(r.props)), count: n(r.n) })),
    records: { accounts: n(counts[0][0]?.n), outcomes: n(counts[1][0]?.n), alerts: n(counts[2][0]?.n) },
  });
}
