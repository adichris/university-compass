import type { DegreeClass, PostgradProfile, PostgradProgramme, Scholarship } from "./types";

export const CLASS_RANK: Record<DegreeClass, number> = {
  first: 5,
  "second-upper": 4,
  "second-lower": 3,
  third: 2,
  pass: 1,
};

export const CLASS_LABELS: Record<DegreeClass, string> = {
  first: "First Class",
  "second-upper": "Second Class Upper",
  "second-lower": "Second Class Lower",
  third: "Third Class",
  pass: "Pass",
};

/** Approximate class from CGPA on a 4.0 or 5.0 scale (Ghanaian universities differ slightly). */
export function classFromCgpa(cgpa: number, scale: 4 | 5): DegreeClass {
  const r = cgpa / scale;
  if (r >= 0.9) return "first"; // 3.6/4, 4.5/5
  if (r >= 0.75) return "second-upper"; // 3.0/4, 3.75/5
  if (r >= 0.625) return "second-lower"; // 2.5/4
  if (r >= 0.5) return "third"; // 2.0/4
  return "pass";
}

export type PgStatus = "eligible" | "borderline" | "not-yet";

export interface PgResult {
  programme: PostgradProgramme;
  status: PgStatus;
  gaps: string[];
  notes: string[];
}

export function matchPostgrad(profile: PostgradProfile, p: PostgradProgramme): PgResult {
  const gaps: string[] = [];
  const notes: string[] = [];
  let soft = 0;

  if (profile.target !== "any" && p.level !== profile.target) return { programme: p, status: "not-yet", gaps: ["Different level"], notes };
  if (profile.location === "ghana" && p.country !== "Ghana") return { programme: p, status: "not-yet", gaps: ["Abroad"], notes };
  if (profile.location === "abroad" && p.country === "Ghana") return { programme: p, status: "not-yet", gaps: ["In Ghana"], notes };

  if (!p.acceptedFields.includes("any") && !p.acceptedFields.includes(profile.field)) {
    gaps.push("Your first degree is usually expected in a related field (some departments accept conversion with extra courses)");
  }
  if (p.requires === "masters" && profile.highest === "bachelor") {
    gaps.push("Requires a master's or MPhil degree first");
  }
  const diff = CLASS_RANK[profile.degreeClass] - CLASS_RANK[p.minClass];
  if (diff < 0) {
    if (diff === -1 && profile.workYears >= 2) {
      soft++;
      notes.push("Your class is one step below the usual minimum - strong work experience or a master's can sometimes compensate");
    } else gaps.push(`Usually requires at least a ${CLASS_LABELS[p.minClass]}`);
  }
  if (profile.workYears < p.workYears) {
    if (p.workYears - profile.workYears <= 1) {
      soft++;
      notes.push(`Prefers ${p.workYears}+ years of work experience`);
    } else gaps.push(`Requires about ${p.workYears} years of work experience (you have ${profile.workYears})`);
  }
  if (p.proposal && !profile.hasProposal) {
    soft++;
    notes.push("You'll need a research proposal");
  }
  if (p.ielts) {
    if (profile.ielts === null) notes.push(`English test likely required (IELTS ${p.ielts}+ or waiver for English-medium degrees)`);
    else if (profile.ielts < p.ielts) gaps.push(`IELTS ${p.ielts}+ required (you have ${profile.ielts})`);
  }
  for (const t of p.tests ?? []) notes.push(`Test: ${t}`);

  const status: PgStatus = gaps.length ? "not-yet" : soft ? "borderline" : "eligible";
  return { programme: p, status, gaps, notes };
}

export interface ScholarshipProfile {
  level: "undergraduate" | "masters" | "phd" | "any";
  field: string | "any";
  destination: string | "any";
  degreeClass?: DegreeClass | null;
  workYears?: number | null;
  age?: number | null;
  needBased?: boolean;
}

export interface ScholarshipMatch {
  scholarship: Scholarship;
  score: number;
  issues: string[];
}

export function matchScholarship(profile: ScholarshipProfile, s: Scholarship): ScholarshipMatch {
  const issues: string[] = [];
  let score = 50;
  if (profile.level !== "any") {
    if (s.levels.includes(profile.level)) score += 20;
    else return { scholarship: s, score: 0, issues: ["Not for your study level"] };
  }
  if (profile.field !== "any") {
    if (s.fields.includes("any") || s.fields.includes(profile.field as never)) score += 10;
    else {
      score -= 25;
      issues.push("Focuses on other fields");
    }
  }
  if (profile.destination !== "any") {
    const dest = profile.destination;
    const ok = s.destinations.some((d) => d === dest || (dest !== "Ghana" && d === "Abroad") || (d === "Europe" && ["United Kingdom", "Germany", "France", "Netherlands", "Hungary"].includes(dest)));
    if (ok) score += 10;
    else return { scholarship: s, score: 0, issues: ["Different study destination"] };
  }
  if (s.minClass && profile.degreeClass) {
    if (CLASS_RANK[profile.degreeClass] >= CLASS_RANK[s.minClass]) score += 5;
    else {
      score -= 30;
      issues.push(`Typically needs at least ${CLASS_LABELS[s.minClass]}`);
    }
  }
  if (s.workYears && profile.workYears != null) {
    if (profile.workYears >= s.workYears) score += 5;
    else {
      score -= 30;
      issues.push(`Needs ${s.workYears}+ years of work experience`);
    }
  }
  if (s.maxAge && profile.age) {
    if (profile.age > s.maxAge) {
      score -= 40;
      issues.push(`Age limit around ${s.maxAge}`);
    }
  }
  if (profile.needBased && s.needBased) score += 5;
  return { scholarship: s, score: Math.max(0, Math.min(100, score)), issues };
}

/** Next occurrence of a typical deadline month, as an ISO date (last day of that month). */
export function nextDeadline(month: number | null, now = new Date()): Date | null {
  if (!month) return null;
  let year = now.getFullYear();
  const candidate = new Date(year, month, 0);
  if (candidate < now) year++;
  return new Date(year, month, 0);
}
