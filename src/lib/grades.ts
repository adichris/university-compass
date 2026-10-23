import type { ExamType } from "./types";

export const WASSCE_GRADES = ["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"] as const;
export const SSSCE_GRADES = ["A", "B", "C", "D", "E", "F"] as const;

export const GRADE_LABELS: Record<string, string> = {
  A1: "Excellent", B2: "Very good", B3: "Good", C4: "Credit", C5: "Credit", C6: "Credit",
  D7: "Pass", E8: "Pass", F9: "Fail",
  A: "Excellent", B: "Very good", C: "Good", D: "Credit", E: "Pass", F: "Fail",
};

export const EXAM_LABELS: Record<ExamType, string> = {
  wassce: "WASSCE (School, May/June)",
  novdec: "WASSCE Private (NOVDEC)",
  sssce: "SSSCE (before 2007)",
};

export function gradesFor(exam: ExamType): readonly string[] {
  return exam === "sssce" ? SSSCE_GRADES : WASSCE_GRADES;
}

/** Points used to build the aggregate in the exam's own scale (A1 = 1 ... F9 = 9, A = 1 ... E = 5). */
export function nativePoints(exam: ExamType, grade: string): number | null {
  const g = grade.toUpperCase().trim();
  if (exam === "sssce") {
    const i = SSSCE_GRADES.indexOf(g as (typeof SSSCE_GRADES)[number]);
    return i === -1 ? null : i + 1;
  }
  const i = WASSCE_GRADES.indexOf(g as (typeof WASSCE_GRADES)[number]);
  return i === -1 ? null : i + 1;
}

const SSSCE_TO_WASSCE: Record<string, number> = { A: 1, B: 3, C: 5, D: 6, E: 7, F: 9 };

/** WASSCE-equivalent points, so requirements like "B3 in Elective Maths" can be checked for any exam. */
export function equivalentPoints(exam: ExamType, grade: string): number | null {
  const g = grade.toUpperCase().trim();
  if (exam === "sssce") return SSSCE_TO_WASSCE[g] ?? null;
  return nativePoints(exam, g);
}

export const CREDIT_MAX = 6; // C6 on the WASSCE scale

export function isCredit(exam: ExamType, grade: string): boolean {
  const p = equivalentPoints(exam, grade);
  return p !== null && p <= CREDIT_MAX;
}

/** Normalise loose grade input (e.g. "b 3", "C-6", OCR "BS") to a code, or null. */
export function normaliseGrade(raw: string, exam: ExamType = "wassce"): string | null {
  let s = raw.toUpperCase().replace(/[\s\-_.]/g, "");
  if (exam === "sssce") return SSSCE_GRADES.includes(s as (typeof SSSCE_GRADES)[number]) ? s : null;
  // Common OCR confusions in the digit position.
  s = s.replace(/^([A-F])[S]$/, "$15").replace(/^([A-F])[lI|]$/, "$11").replace(/^([A-F])[Z]$/, "$12").replace(/^([A-F])[G]$/, "$16").replace(/^([A-F])[B]$/, "$18");
  return WASSCE_GRADES.includes(s as (typeof WASSCE_GRADES)[number]) ? s : null;
}
