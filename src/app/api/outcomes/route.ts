import { clientKey, rateLimited } from "@/lib/auth";
import { programmes } from "@/lib/data";
import { db, ready } from "@/lib/db";

const ids = new Set(programmes.map((p) => p.id));

export interface OutcomeStats {
  n: number;
  admitted: number;
  bestAdmitted: number | null;
  worstAdmitted: number | null;
}

/** Crowdsourced admission outcomes, summarised per programme. Anonymous - no account needed. */
export async function GET() {
  await ready();
  const since = new Date().getFullYear() - 3;
  const r = await db.execute({
    sql: `SELECT programme_id,
                 COUNT(*) AS n,
                 MIN(CASE WHEN admitted = 1 THEN aggregate END) AS best_admitted,
                 MAX(CASE WHEN admitted = 1 THEN aggregate END) AS worst_admitted,
                 SUM(admitted) AS admitted
          FROM outcomes WHERE year >= ? GROUP BY programme_id`,
    args: [since],
  });
  const stats: Record<string, OutcomeStats> = {};
  for (const row of r.rows) {
    stats[String(row.programme_id)] = {
      n: Number(row.n),
      admitted: Number(row.admitted),
      bestAdmitted: row.best_admitted === null ? null : Number(row.best_admitted),
      worstAdmitted: row.worst_admitted === null ? null : Number(row.worst_admitted),
    };
  }
  return Response.json({ stats });
}

export async function POST(req: Request) {
  const who = clientKey(req);
  if (rateLimited(`outcome:${who}`, 10, 24 * 3_600_000)) {
    return Response.json({ error: "Thanks! You've submitted plenty today." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const programmeId = String(body?.programmeId ?? "");
  const aggregate = Number(body?.aggregate);
  const year = Number(body?.year);
  const admitted = Boolean(body?.admitted);
  const thisYear = new Date().getFullYear();
  if (
    !ids.has(programmeId) ||
    !Number.isInteger(aggregate) || aggregate < 6 || aggregate > 54 ||
    !Number.isInteger(year) || year < thisYear - 5 || year > thisYear
  ) {
    return Response.json({ error: "Please check the programme, aggregate and year." }, { status: 400 });
  }
  await ready();
  await db.execute({
    sql: "INSERT INTO outcomes (programme_id, aggregate, year, admitted, reporter_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [programmeId, aggregate, year, admitted ? 1 : 0, who, Date.now()],
  });
  return Response.json({ ok: true });
}
