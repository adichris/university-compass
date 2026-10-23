import subjectsJson from "../../data/subjects.json";
import { normaliseGrade } from "./grades";

const canonical = Array.from(new Set([...subjectsJson.core, ...Object.values(subjectsJson.tracks).flat()]));

// Longest names first so "MATHEMATICS(ELECT)" wins over "MATHEMATICS".
const matchers: { key: string; subject: string }[] = [
  ...Object.entries(subjectsJson.aliases).map(([k, v]) => ({ key: k, subject: v })),
  ...canonical.map((s) => ({ key: s.toUpperCase(), subject: s })),
].sort((a, b) => b.key.length - a.key.length);

const squash = (s: string) => s.toUpperCase().replace(/[^A-Z0-9()]/g, "");

/**
 * Pull subject/grade pairs out of text copied from the WAEC results page,
 * a printed slip, or OCR output. Unknown lines are ignored.
 */
export function parseResultText(text: string): { grades: Record<string, string>; unmatched: string[] } {
  const grades: Record<string, string> = {};
  const unmatched: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const flat = squash(line);
    const hit = matchers.find((m) => flat.includes(squash(m.key)));
    if (!hit) continue;
    const after = line.toUpperCase().slice(Math.max(0, line.toUpperCase().indexOf(hit.key.split(/[ (]/)[0])));
    const tokens = after.match(/\b[A-F]\s?[0-9SlIZGB|]\b/g) ?? [];
    const grade = tokens.map((t) => normaliseGrade(t)).find(Boolean);
    if (grade) grades[hit.subject] = grade;
    else unmatched.push(line);
  }
  return { grades, unmatched };
}
