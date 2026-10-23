export type ExamType = "wassce" | "novdec" | "sssce";

export type Field =
  | "health"
  | "engineering"
  | "science"
  | "agriculture"
  | "business"
  | "law"
  | "social-science"
  | "humanities"
  | "education"
  | "arts"
  | "technical";

export type Level = "degree" | "diploma" | "hnd";

export interface Sitting {
  id: string;
  exam: ExamType;
  year: number;
  /** subject name -> grade code, e.g. { "Physics": "B3" } */
  grades: Record<string, string>;
}

export interface University {
  slug: string;
  name: string;
  short: string;
  type: "public" | "private" | "technical";
  region: string;
  city: string;
  website: string;
  admissionsUrl: string;
  multipleSittings: boolean;
  maxSittings: number;
  feesRange: string;
  description: string;
}

export interface ElectiveGroup {
  anyOf: string[];
  count: number;
}

export interface ProgrammeTemplate {
  name: string;
  field: Field;
  level: Level;
  years: number;
  core: "best" | "science" | "social";
  groups: ElectiveGroup[];
  /** null = any elective; [] = groups must supply all three */
  fillFrom: string[] | null;
  minGrades?: Record<string, string>;
  maxAggregate?: number;
  careers: string[];
}

export interface Programme extends ProgrammeTemplate {
  id: string;
  template: string;
  university: string;
  cutoff: number | null;
  history?: Record<string, number>;
  note?: string;
  source?: string;
  verified: boolean;
  lastChecked?: string;
}

export type Chance = "safe" | "competitive" | "reach" | "unlikely" | "ineligible";

export interface EligibilityResult {
  programme: Programme;
  chance: Chance;
  aggregate: number | null;
  /** subjects counted towards the aggregate */
  counted: { subject: string; grade: string }[];
  reasons: string[];
  usedCombinedSittings: boolean;
}

export type DegreeClass = "first" | "second-upper" | "second-lower" | "third" | "pass";

export interface PostgradProgramme {
  id: string;
  university: string | null;
  universityName?: string;
  country: string;
  name: string;
  level: "masters" | "mphil" | "phd";
  field: Field | "any";
  acceptedFields: (Field | "any")[];
  minClass: DegreeClass;
  requires: "bachelor" | "masters";
  workYears: number;
  proposal: boolean;
  tests?: string[];
  ielts?: number;
  durationYears: number;
  modes: string[];
  url: string;
  note?: string;
}

export interface PostgradProfile {
  highest: "bachelor" | "masters" | "mphil";
  degreeClass: DegreeClass;
  field: Field;
  workYears: number;
  hasProposal: boolean;
  ielts: number | null;
  target: "any" | "masters" | "mphil" | "phd";
  location: "any" | "ghana" | "abroad";
  age: number | null;
}

export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  kind: "scholarship" | "loan";
  levels: ("undergraduate" | "masters" | "phd")[];
  destinations: string[];
  fields: (Field | "any")[];
  eligibility: string;
  coverage: string;
  needBased: boolean;
  minClass?: DegreeClass;
  workYears?: number;
  maxAge?: number;
  deadlineWindow: string;
  deadlineMonth: number | null;
  url: string;
}

export interface Update {
  id: string;
  kind: "results" | "admissions";
  title: string;
  status: "expected" | "released" | "open" | "closed";
  window: string;
  url: string;
  note?: string;
}
