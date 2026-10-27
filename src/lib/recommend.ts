import type { Chance, EligibilityResult, Field, University } from "./types";

export type RecommendationGroup = "strong" | "ambitious" | "backup";

export interface Recommendation {
  result: EligibilityResult;
  group: RecommendationGroup;
  /** One plain-language sentence explaining the pick */
  why: string;
}

export interface Recommendations {
  strong: Recommendation[];
  ambitious: Recommendation[];
  backup: Recommendation[];
  /** How many realistic options the student has per field (before any field filter), most first */
  fieldCounts: { field: Field; count: number }[];
}

export interface RecommendOptions {
  field: Field | "any";
  region: string | "any";
  universities: Map<string, University>;
  /** Most picks from one university per group, so the shortlist isn't one school */
  perUniversity?: number;
}

const REALISTIC: Chance[] = ["safe", "competitive", "reach", "eligible"];
const LIMITS: Record<RecommendationGroup, number> = { strong: 6, ambitious: 4, backup: 4 };

const margin = (r: EligibilityResult) => (r.programme.cutoff ?? 0) - (r.aggregate ?? 0);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function why(group: RecommendationGroup, r: EligibilityResult): string {
  const { cutoff } = r.programme;
  const agg = r.aggregate;
  if (cutoff === null || agg === null) {
    return r.programme.requirementsKnown
      ? "You meet this programme's subject requirements; no cut-off has been published yet."
      : "You meet the general entry rules; confirm the required subjects with the institution.";
  }
  const m = cutoff - agg;
  if (group === "ambitious") {
    return `Last cut-off was ${cutoff}; you're ${plural(-m, "point")} off - possible if this year's cut-off rises.`;
  }
  if (group === "backup") return `Comfortably within reach: your aggregate ${agg} vs a last cut-off of ${cutoff}.`;
  return m === 0
    ? `Your aggregate ${agg} matches last year's cut-off of ${cutoff} exactly.`
    : `Your aggregate ${agg} is ${plural(m, "point")} better than last year's cut-off of ${cutoff}.`;
}

/** Take up to `limit` picks, at most `perUni` from any one university, skipping already chosen programmes. */
function pick(pool: EligibilityResult[], limit: number, perUni: number, taken: Set<string>): EligibilityResult[] {
  const perUniCount = new Map<string, number>();
  const out: EligibilityResult[] = [];
  for (const r of pool) {
    if (out.length >= limit) break;
    const p = r.programme;
    if (taken.has(p.id)) continue;
    const n = perUniCount.get(p.university) ?? 0;
    if (n >= perUni) continue;
    perUniCount.set(p.university, n + 1);
    taken.add(p.id);
    out.push(r);
  }
  return out;
}

/**
 * Turn eligibility results into a short, explained shortlist.
 * - strong: safe/competitive with a published cut-off, most selective first
 * - ambitious: just outside the cut-off (reach), closest first
 * - backup: the biggest safety margins, then programmes with no cut-off data
 * Programmes with confirmed subject requirements come first; unconfirmed ones only fill gaps.
 */
export function recommend(results: EligibilityResult[], opts: RecommendOptions): Recommendations {
  const perUni = opts.perUniversity ?? 2;
  const realistic = results.filter((r) => REALISTIC.includes(r.chance));

  const counts = new Map<Field, number>();
  for (const r of realistic) counts.set(r.programme.field, (counts.get(r.programme.field) ?? 0) + 1);
  const fieldCounts = [...counts.entries()].map(([field, count]) => ({ field, count })).sort((a, b) => b.count - a.count);

  const pool = realistic.filter((r) => {
    if (opts.field !== "any" && r.programme.field !== opts.field) return false;
    if (opts.region !== "any" && opts.universities.get(r.programme.university)?.region !== opts.region) return false;
    return true;
  });
  // Confirmed requirements first, everything else stays in its own order.
  const known = (a: EligibilityResult, b: EligibilityResult) => Number(b.programme.requirementsKnown) - Number(a.programme.requirementsKnown);
  const taken = new Set<string>();

  const strongPool = pool
    .filter((r) => (r.chance === "safe" || r.chance === "competitive") && r.programme.cutoff !== null)
    .sort((a, b) => known(a, b) || a.programme.cutoff! - b.programme.cutoff! || margin(a) - margin(b));
  const strong = pick(strongPool, LIMITS.strong, perUni, taken);

  const ambitiousPool = pool.filter((r) => r.chance === "reach").sort((a, b) => known(a, b) || margin(b) - margin(a) || a.programme.cutoff! - b.programme.cutoff!);
  const ambitious = pick(ambitiousPool, LIMITS.ambitious, perUni, taken);

  const backupPool = [
    ...pool.filter((r) => r.chance === "safe" && r.programme.cutoff !== null).sort((a, b) => known(a, b) || margin(b) - margin(a)),
    ...pool.filter((r) => r.chance === "eligible").sort((a, b) => known(a, b) || (a.programme.level === "degree" ? -1 : 0) - (b.programme.level === "degree" ? -1 : 0)),
  ];
  const backup = pick(backupPool, LIMITS.backup, perUni, taken);

  const wrap = (group: RecommendationGroup) => (r: EligibilityResult): Recommendation => ({ result: r, group, why: why(group, r) });
  return { strong: strong.map(wrap("strong")), ambitious: ambitious.map(wrap("ambitious")), backup: backup.map(wrap("backup")), fieldCounts };
}
