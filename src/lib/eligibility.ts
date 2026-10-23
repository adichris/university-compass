import { equivalentPoints, isCredit, nativePoints } from "./grades";
import type { Chance, EligibilityResult, ExamType, Programme, Sitting, University } from "./types";

export const CORE = {
  english: "English Language",
  maths: "Core Mathematics",
  science: "Integrated Science",
  social: "Social Studies",
} as const;

const CORE_SUBJECTS: string[] = Object.values(CORE);

export interface GradeSet {
  exam: ExamType;
  grades: Record<string, string>;
  combined: boolean;
}

interface Evaluation {
  eligible: boolean;
  aggregate: number | null;
  counted: { subject: string; grade: string }[];
  reasons: string[];
}

export function defaultMaxAggregate(p: Pick<Programme, "level" | "maxAggregate">): number {
  return p.maxAggregate ?? (p.level === "degree" ? 24 : 36);
}

/** Every grade set the student may present: each sitting alone, plus allowed combinations. */
export function gradeSets(sittings: Sitting[], uni?: Pick<University, "multipleSittings" | "maxSittings">): GradeSet[] {
  const valid = sittings.filter((s) => Object.keys(s.grades).length > 0);
  const sets: GradeSet[] = valid.map((s) => ({ exam: s.exam, grades: s.grades, combined: false }));
  if (!uni?.multipleSittings || uni.maxSittings < 2) return sets;

  // SSSCE and WASSCE use different scales, so only combine within the same scale.
  for (const scale of ["wassce", "sssce"] as const) {
    const group = valid.filter((s) => (scale === "sssce" ? s.exam === "sssce" : s.exam !== "sssce"));
    for (const subset of subsets(group, 2, uni.maxSittings)) {
      const grades: Record<string, string> = {};
      for (const s of subset) {
        for (const [subject, grade] of Object.entries(s.grades)) {
          const cur = grades[subject];
          const p = nativePoints(s.exam, grade);
          if (p === null) continue;
          if (!cur || p < (nativePoints(s.exam, cur) ?? 99)) grades[subject] = grade;
        }
      }
      sets.push({ exam: subset[0].exam, grades, combined: true });
    }
  }
  return sets;
}

function subsets<T>(items: T[], min: number, max: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, acc: T[]) => {
    if (acc.length >= min) out.push([...acc]);
    if (acc.length === max) return;
    for (let i = start; i < items.length; i++) rec(i + 1, [...acc, items[i]]);
  };
  rec(0, []);
  return out;
}

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [head, ...tail] = items;
  return [...combinations(tail, k - 1).map((c) => [head, ...c]), ...combinations(tail, k)];
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((p) => [x, ...p]));
}

/** Can these three electives fill the programme's elective slots? */
function comboFits(combo: string[], p: Programme): boolean {
  const slots: (Set<string> | null)[] = [];
  for (const g of p.groups) for (let i = 0; i < g.count; i++) slots.push(new Set(g.anyOf));
  if (slots.length > 3) return false;
  while (slots.length < 3) slots.push(p.fillFrom === null ? null : new Set(p.fillFrom));
  return permutations(combo).some((perm) => perm.every((subj, i) => slots[i] === null || slots[i]!.has(subj)));
}

const list = (xs: string[]) => (xs.length <= 2 ? xs.join(" or ") : `${xs.slice(0, -1).join(", ")} or ${xs[xs.length - 1]}`);

export function evaluate(set: GradeSet, p: Programme): Evaluation {
  const { exam, grades } = set;
  const reasons: string[] = [];
  const credit = (s: string) => grades[s] !== undefined && isCredit(exam, grades[s]);
  const pts = (s: string) => nativePoints(exam, grades[s]) ?? 99;

  // Core subjects.
  const counted: { subject: string; grade: string }[] = [];
  for (const s of [CORE.english, CORE.maths]) {
    if (!credit(s)) reasons.push(`Needs a credit (C6 or better) in ${s}`);
    else counted.push({ subject: s, grade: grades[s] });
  }
  let third: string | null = null;
  if (p.core === "science" || p.core === "social") {
    const s = p.core === "science" ? CORE.science : CORE.social;
    if (credit(s)) third = s;
    else reasons.push(`Needs a credit in ${s}`);
  } else {
    const options = [CORE.science, CORE.social].filter(credit).sort((a, b) => pts(a) - pts(b));
    if (options.length) third = options[0];
    else reasons.push("Needs a credit in Integrated Science or Social Studies");
  }
  if (third) counted.push({ subject: third, grade: grades[third] });

  // Specific minimum grades.
  for (const [subject, min] of Object.entries(p.minGrades ?? {})) {
    const have = grades[subject];
    const need = equivalentPoints("wassce", min)!;
    const got = have ? equivalentPoints(exam, have) : null;
    if (got === null || got > need) reasons.push(`Needs ${min} or better in ${subject}${have ? ` (you have ${have})` : ""}`);
  }

  // Electives.
  const electives = Object.keys(grades).filter((s) => !CORE_SUBJECTS.includes(s) && credit(s));
  let best: string[] | null = null;
  let bestSum = Infinity;
  for (const combo of combinations(electives, 3)) {
    if (!comboFits(combo, p)) continue;
    const sum = combo.reduce((a, s) => a + pts(s), 0);
    if (sum < bestSum) {
      bestSum = sum;
      best = combo;
    }
  }
  if (!best) {
    const before = reasons.length;
    if (electives.length < 3) reasons.push(`Needs credits in at least 3 elective subjects (you have ${electives.length})`);
    for (const g of p.groups) {
      const have = electives.filter((e) => g.anyOf.includes(e)).length;
      if (have < g.count) {
        reasons.push(g.count === 1 && g.anyOf.length === 1 ? `Needs a credit in ${g.anyOf[0]}` : g.count === 1 ? `Needs a credit in ${list(g.anyOf)}` : `Needs credits in ${g.count} of: ${g.anyOf.join(", ")}`);
      }
    }
    if (reasons.length === before) {
      reasons.push(p.fillFrom && p.fillFrom.length ? `Remaining electives must come from: ${p.fillFrom.join(", ")}` : "Your electives don't match the required subject combination");
    }
  } else {
    for (const s of best.sort((a, b) => pts(a) - pts(b))) counted.push({ subject: s, grade: grades[s] });
  }

  if (reasons.length) return { eligible: false, aggregate: null, counted, reasons };

  const aggregate = counted.reduce((a, c) => a + pts(c.subject), 0);
  const max = defaultMaxAggregate(p);
  if (aggregate > max) {
    return { eligible: false, aggregate, counted, reasons: [`Aggregate ${aggregate} is above the maximum of ${max} for this programme`] };
  }
  return { eligible: true, aggregate, counted, reasons: [] };
}

export function chanceFor(aggregate: number, cutoff: number | null): Chance {
  if (cutoff === null) return "competitive";
  const margin = cutoff - aggregate;
  if (margin >= 2) return "safe";
  if (margin >= 0) return "competitive";
  if (margin >= -2) return "reach";
  return "unlikely";
}

export function checkProgramme(sittings: Sitting[], p: Programme, uni?: University): EligibilityResult {
  const sets = gradeSets(sittings, uni);
  let bestEval: (Evaluation & { set: GradeSet }) | null = null;
  for (const set of sets) {
    const e = { ...evaluate(set, p), set };
    if (!bestEval) bestEval = e;
    else if (e.eligible && (!bestEval.eligible || e.aggregate! < bestEval.aggregate!)) bestEval = e;
    else if (!e.eligible && !bestEval.eligible && e.reasons.length < bestEval.reasons.length) bestEval = e;
  }
  if (!bestEval) {
    return { programme: p, chance: "ineligible", aggregate: null, counted: [], reasons: ["Enter your grades to check"], usedCombinedSittings: false };
  }
  const reasons = [...bestEval.reasons];
  let chance: Chance = "ineligible";
  if (bestEval.eligible) {
    // SSSCE aggregates are on a different scale from current cut-offs.
    const cutoff = bestEval.set.exam === "sssce" ? null : p.cutoff;
    chance = chanceFor(bestEval.aggregate!, cutoff);
    if (cutoff === null) reasons.push(bestEval.set.exam === "sssce" ? "SSSCE: meets minimum entry; confirm current cut-off with the university" : "No recent cut-off data - you meet the minimum requirements");
  }
  return {
    programme: p,
    chance,
    aggregate: bestEval.aggregate,
    counted: bestEval.counted,
    reasons,
    usedCombinedSittings: bestEval.set.combined,
  };
}

/** The student's general aggregate: English + Core Maths + best other core + best 3 electives. */
export function generalAggregate(sittings: Sitting[]): number | null {
  let best: number | null = null;
  for (const set of gradeSets(sittings, { multipleSittings: true, maxSittings: 2 })) {
    const pts = (s: string) => (set.grades[s] ? nativePoints(set.exam, set.grades[s]) : null);
    const e = pts(CORE.english);
    const m = pts(CORE.maths);
    const other = [pts(CORE.science), pts(CORE.social)].filter((x): x is number => x !== null);
    const electives = Object.keys(set.grades)
      .filter((s) => !CORE_SUBJECTS.includes(s))
      .map(pts)
      .filter((x): x is number => x !== null)
      .sort((a, b) => a - b);
    if (e === null || m === null || !other.length || electives.length < 3) continue;
    const agg = e + m + Math.min(...other) + electives[0] + electives[1] + electives[2];
    if (best === null || agg < best) best = agg;
  }
  return best;
}

export const CHANCE_ORDER: Chance[] = ["safe", "competitive", "reach", "unlikely", "ineligible"];
