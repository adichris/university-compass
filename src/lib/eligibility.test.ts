import { describe, expect, it } from "vitest";
import { checkProgramme, chanceFor, generalAggregate } from "./eligibility";
import { programmes, universityBySlug } from "./data";
import { parseResultText } from "./parse-results";
import { classFromCgpa, matchPostgrad } from "./postgrad";
import { postgradProgrammes } from "./data";
import type { Sitting } from "./types";

const science: Sitting = {
  id: "a",
  exam: "wassce",
  year: 2025,
  grades: {
    "English Language": "B2",
    "Core Mathematics": "A1",
    "Integrated Science": "A1",
    "Social Studies": "B3",
    Physics: "B2",
    Chemistry: "A1",
    Biology: "B3",
    "Elective Mathematics": "C4",
  },
};

const prog = (id: string) => {
  const p = programmes.find((x) => x.id === id);
  if (!p) throw new Error(`missing ${id}`);
  return p;
};

describe("eligibility", () => {
  it("computes the best aggregate for medicine using the required electives", () => {
    const r = checkProgramme([science], prog("ug-medicine"), universityBySlug.get("ug"));
    // English 2 + Maths 1 + Int Sci 1 + Chem 1 + Phys 2 + Bio 3 = 10
    expect(r.aggregate).toBe(10);
    expect(r.counted.map((c) => c.subject)).toContain("Biology");
    expect(r.chance).toBe("unlikely"); // cut-off 6
  });

  it("rejects an arts student for medicine with clear reasons", () => {
    const arts: Sitting = {
      id: "b",
      exam: "wassce",
      year: 2025,
      grades: { "English Language": "A1", "Core Mathematics": "B2", "Integrated Science": "C4", "Social Studies": "A1", Government: "A1", History: "A1", "Literature in English": "B2", Economics: "B3" },
    };
    const r = checkProgramme([arts], prog("ug-medicine"));
    expect(r.chance).toBe("ineligible");
    expect(r.reasons.join(" ")).toMatch(/Chemistry/);
    const law = checkProgramme([arts], prog("ug-law"));
    expect(law.aggregate).toBe(8); // 1 + 2 + 1 + Gov 1 + Hist 1 + Lit 2
    expect(law.chance).toBe("competitive"); // cut-off 9
  });

  it("enforces specific minimum grades", () => {
    const r = checkProgramme([science], prog("knust-actuarial-science"));
    expect(r.chance).toBe("ineligible");
    expect(r.reasons[0]).toMatch(/Elective Mathematics/);
  });

  it("fails on a non-credit core subject", () => {
    const weak = { ...science, grades: { ...science.grades, "English Language": "D7" } };
    const r = checkProgramme([weak], prog("ug-computer-science"));
    expect(r.chance).toBe("ineligible");
    expect(r.reasons[0]).toMatch(/English Language/);
  });

  it("combines sittings when the university allows it", () => {
    const may: Sitting = { ...science, id: "c", grades: { ...science.grades, "English Language": "D7" } };
    const novdec: Sitting = { id: "d", exam: "novdec", year: 2025, grades: { "English Language": "B3" } };
    const r = checkProgramme([may, novdec], prog("ug-computer-science"), universityBySlug.get("ug"));
    expect(r.chance).not.toBe("ineligible");
    expect(r.usedCombinedSittings).toBe(true);
    const single = checkProgramme([may, novdec], prog("ashesi-computer-science"), universityBySlug.get("ashesi"));
    expect(single.chance).toBe("ineligible");
  });

  it("maps margins to chances", () => {
    expect(chanceFor(8, 12)).toBe("safe");
    expect(chanceFor(12, 12)).toBe("competitive");
    expect(chanceFor(13, 12)).toBe("reach");
    expect(chanceFor(16, 12)).toBe("unlikely");
  });

  it("computes the general aggregate", () => {
    expect(generalAggregate([science])).toBe(2 + 1 + 1 + 1 + 2 + 3);
  });

  it("every offering references a real university", () => {
    for (const p of programmes) expect(universityBySlug.has(p.university)).toBe(true);
  });
});

describe("result text parsing", () => {
  it("reads a pasted WAEC results table", () => {
    const text = `ENGLISH LANG          B3
MATHEMATICS(CORE)     C4
INTEGRATED SCIENCE    B2
SOCIAL STUDIES        A1
MATHEMATICS(ELECT)    C6
PHYSICS               BS
CHEMISTRY             B2
BIOLOGY               A1`;
    const { grades } = parseResultText(text);
    expect(grades).toMatchObject({
      "English Language": "B3",
      "Core Mathematics": "C4",
      "Elective Mathematics": "C6",
    });
    expect(grades["Physics"]).toBeUndefined(); // "BS" -> B5 is not a valid WASSCE grade
    expect(grades["Chemistry"]).toBe("B2");
    expect(grades["Biology"]).toBe("A1");
  });
});

describe("postgrad", () => {
  it("derives class from CGPA", () => {
    expect(classFromCgpa(3.7, 4)).toBe("first");
    expect(classFromCgpa(3.2, 4)).toBe("second-upper");
    expect(classFromCgpa(2.7, 4)).toBe("second-lower");
  });

  it("flags missing master's for PhD", () => {
    const pg = (id: string) => postgradProgrammes.find((p) => p.id === id)!;
    const r = matchPostgrad(
      { highest: "bachelor", degreeClass: "first", field: "science", workYears: 0, hasProposal: true, ielts: null, target: "any", location: "any", age: 24 },
      pg("knust-phd-cs"),
    );
    expect(r.status).toBe("not-yet");
  });
});

describe("programmes without mapped requirements", () => {
  const generic = {
    ...programmes.find((p) => p.id === "ug-business-admin")!,
    id: "x--bsc-something",
    template: null,
    requirementsKnown: false,
    groups: [],
    fillFrom: null,
    cutoff: null,
    maxAggregate: 24,
  };

  it("uses general rules, reports Meets minimum and says requirements are unverified", () => {
    const r = checkProgramme([science], generic);
    expect(r.chance).toBe("eligible");
    expect(r.reasons.join(" ")).toMatch(/general entry rules/);
  });

  it("still applies the aggregate cap", () => {
    const weak: Sitting = { ...science, grades: Object.fromEntries(Object.keys(science.grades).map((k) => [k, "C6"])) };
    expect(checkProgramme([weak], generic).chance).toBe("ineligible"); // 36 > 24
  });

  it("maps a missing cut-off to eligible", () => {
    expect(chanceFor(20, null)).toBe("eligible");
  });
});
