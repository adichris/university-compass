import { describe, expect, it } from "vitest";
import { programmes, universityBySlug } from "./data";
import { checkProgramme } from "./eligibility";
import { recommend } from "./recommend";
import type { Sitting } from "./types";

const science: Sitting = {
  id: "r",
  exam: "wassce",
  year: 2025,
  grades: {
    "English Language": "B2",
    "Core Mathematics": "B3",
    "Integrated Science": "B2",
    "Social Studies": "A1",
    Physics: "C4",
    Chemistry: "B3",
    Biology: "B2",
    "Elective Mathematics": "C5",
  },
};

const results = programmes.map((p) => checkProgramme([science], p, universityBySlug.get(p.university)));
const opts = { field: "any" as const, region: "any" as const, universities: universityBySlug };

describe("recommendations", () => {
  const recs = recommend(results, opts);

  it("fills each group with realistic, explained picks", () => {
    expect(recs.strong.length).toBeGreaterThan(0);
    for (const r of recs.strong) {
      expect(["safe", "competitive"]).toContain(r.result.chance);
      expect(r.result.programme.cutoff).not.toBeNull();
      expect(r.why).toMatch(/cut-off/);
    }
    for (const r of recs.ambitious) expect(r.result.chance).toBe("reach");
  });

  it("orders strong picks from most selective and never repeats a programme", () => {
    const cutoffs = recs.strong.map((r) => r.result.programme.cutoff!);
    expect([...cutoffs].sort((a, b) => a - b)).toEqual(cutoffs);
    const ids = [...recs.strong, ...recs.ambitious, ...recs.backup].map((r) => r.result.programme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("limits picks per university", () => {
    for (const group of [recs.strong, recs.ambitious, recs.backup]) {
      const perUni = new Map<string, number>();
      for (const r of group) perUni.set(r.result.programme.university, (perUni.get(r.result.programme.university) ?? 0) + 1);
      expect(Math.max(0, ...perUni.values())).toBeLessThanOrEqual(2);
    }
  });

  it("respects a chosen field and counts options per field", () => {
    const health = recommend(results, { ...opts, field: "health" });
    for (const r of [...health.strong, ...health.ambitious, ...health.backup]) expect(r.result.programme.field).toBe("health");
    expect(health.fieldCounts.length).toBeGreaterThan(1);
    expect(health.fieldCounts[0].count).toBeGreaterThanOrEqual(health.fieldCounts.at(-1)!.count);
  });

  it("respects a chosen region", () => {
    const north = recommend(results, { ...opts, region: "Northern" });
    for (const r of [...north.strong, ...north.ambitious, ...north.backup]) {
      expect(universityBySlug.get(r.result.programme.university)?.region).toBe("Northern");
    }
  });
});
