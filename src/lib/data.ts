import universitiesJson from "../../data/universities.json";
import templatesJson from "../../data/programme-templates.json";
import offeringsJson from "../../data/offerings.json";
import postgradJson from "../../data/postgrad.json";
import scholarshipsJson from "../../data/scholarships.json";
import updatesJson from "../../data/updates.json";
import subjectsJson from "../../data/subjects.json";
import gtecInstitutionsJson from "../../data/generated/institutions.json";
import gtecProgrammesJson from "../../data/generated/programmes.json";
import gtecPostgradJson from "../../data/generated/postgrad.json";
import type {
  Field,
  InstitutionType,
  Level,
  PostgradProgramme,
  Programme,
  ProgrammeTemplate,
  Scholarship,
  University,
  Update,
} from "./types";

type OfferingOverride = Partial<Omit<Programme, "id" | "template" | "university">> & { cutoff?: number | null };

interface GtecProgramme {
  id: string;
  university: string;
  template: string | null;
  name: string;
  level: Level;
  field: Field;
  requirementsKnown: boolean;
  accreditedTo: string | null;
}

const gtec = gtecInstitutionsJson as {
  fetched: string;
  institutions: University[];
  links: Record<string, { gtecId: number; category: string; gtecUrl: string }>;
};

/** Curated institutions (with cut-offs) plus every other institution GTEC lists as accredited. */
export const universities: University[] = [
  ...(universitiesJson as University[]).map((u) => {
    const link = gtec.links[u.slug];
    return link ? { ...u, gtecId: link.gtecId, category: link.category, gtecUrl: link.gtecUrl } : u;
  }),
  ...gtec.institutions,
];

/** Date the GTEC register was last crawled, or "" if it hasn't been. */
export const gtecFetched = gtec.fetched;

export const subjects = subjectsJson as {
  core: string[];
  tracks: Record<string, string[]>;
  aliases: Record<string, string>;
};
export const postgradProgrammes = [
  ...(postgradJson as PostgradProgramme[]),
  ...((gtecPostgradJson as { programmes: PostgradProgramme[] }).programmes),
];
export const scholarships = scholarshipsJson as Scholarship[];
export const updates = updatesJson as Update[];

const templates = Object.fromEntries(
  Object.entries(templatesJson).filter(([k]) => !k.startsWith("_")),
) as Record<string, ProgrammeTemplate>;

export const programmeTemplates = templates;

/** General entry rules used when a programme's specific subject requirements aren't mapped yet. */
const GENERAL_RULES: Record<Level, Pick<ProgrammeTemplate, "core" | "groups" | "fillFrom" | "maxAggregate" | "years">> = {
  degree: { core: "best", groups: [], fillFrom: null, maxAggregate: 24, years: 4 },
  hnd: { core: "best", groups: [], fillFrom: null, maxAggregate: 36, years: 3 },
  diploma: { core: "best", groups: [], fillFrom: null, maxAggregate: 36, years: 2 },
};

function expandOfferings(): Programme[] {
  const out: Programme[] = [];
  for (const [uni, list] of Object.entries(offeringsJson)) {
    if (uni.startsWith("_")) continue;
    for (const [key, value] of Object.entries(list as Record<string, number | OfferingOverride>)) {
      const tpl = templates[key];
      if (!tpl) throw new Error(`offerings.json: unknown programme template "${key}" at ${uni}`);
      const override: OfferingOverride = typeof value === "number" ? { cutoff: value } : value;
      out.push({
        ...tpl,
        ...override,
        id: `${uni}-${key}`,
        template: key,
        university: uni,
        cutoff: override.cutoff ?? null,
        verified: override.verified ?? false,
        requirementsKnown: true,
      });
    }
  }
  return out;
}

function expandGtecProgrammes(): Programme[] {
  return (gtecProgrammesJson as { programmes: GtecProgramme[] }).programmes.map((g) => {
    const tpl = g.template ? templates[g.template] : undefined;
    const base: ProgrammeTemplate = tpl ?? { ...GENERAL_RULES[g.level], name: g.name, field: g.field, level: g.level, careers: [] };
    return {
      ...base,
      id: g.id,
      name: g.name,
      template: g.template,
      university: g.university,
      cutoff: null,
      verified: false,
      requirementsKnown: g.requirementsKnown,
      accreditedTo: g.accreditedTo,
      source: "GTEC accredited programmes register",
    };
  });
}

export const programmes = [...expandOfferings(), ...expandGtecProgrammes()];

export const universityBySlug = new Map(universities.map((u) => [u.slug, u]));

export const allElectives = Array.from(
  new Set(Object.values(subjects.tracks).flat()),
).sort();

export const FIELD_LABELS: Record<Field, string> = {
  health: "Health & Medicine",
  engineering: "Engineering & Built Environment",
  science: "Science & Computing",
  agriculture: "Agriculture & Natural Resources",
  business: "Business & Economics",
  law: "Law",
  "social-science": "Social Sciences",
  humanities: "Humanities & Languages",
  education: "Education",
  arts: "Arts & Design",
  technical: "Technical / HND",
};

export const TYPE_LABELS: Record<InstitutionType, string> = {
  public: "Public universities",
  technical: "Technical universities",
  private: "Private universities & university colleges",
  "college-of-education": "Colleges of education",
  "health-college": "Nursing & health training colleges",
  "agric-college": "Colleges of agriculture",
};

export const TYPE_ORDER = Object.keys(TYPE_LABELS) as InstitutionType[];

export const REGIONS = Array.from(new Set(universities.map((u) => u.region)))
  .filter((r) => r && r !== "Other")
  .sort();
