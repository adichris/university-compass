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
// Server-side files (git-ignored, created by scripts/prepare-data.mjs): admin edits and GTEC data
// refreshed from the admin dashboard. Empty files fall back to the committed data above.
import localInstitutionsJson from "../../data/local/generated/institutions.json";
import localProgrammesJson from "../../data/local/generated/programmes.json";
import localPostgradJson from "../../data/local/generated/postgrad.json";
import overridesJson from "../../data/local/overrides.json";
import type { Overrides } from "./overrides";
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

type GtecInstitutions = {
  fetched: string;
  institutions: University[];
  links: Record<string, { gtecId: number; category: string; gtecUrl: string }>;
};

// A dashboard GTEC refresh replaces the committed snapshot as a whole (institutions + programmes).
const useLocalGtec = Boolean((localInstitutionsJson as GtecInstitutions).fetched);
const gtec = (useLocalGtec ? localInstitutionsJson : gtecInstitutionsJson) as GtecInstitutions;
const gtecProgrammeData = (useLocalGtec ? localProgrammesJson : gtecProgrammesJson) as { programmes: GtecProgramme[] };
const gtecPostgradData = (useLocalGtec ? localPostgradJson : gtecPostgradJson) as { programmes: PostgradProgramme[] };

const overrides = overridesJson as Overrides;
/** When the admin edits included in this build were last saved (null = none). */
export const overridesBuiltAt = overrides.updatedAt;

/** Curated institutions (with cut-offs) plus every other institution GTEC lists as accredited. */
const allUniversities: University[] = [
  ...(universitiesJson as University[]).map((u) => {
    const link = gtec.links[u.slug];
    return link ? { ...u, gtecId: link.gtecId, category: link.category, gtecUrl: link.gtecUrl } : u;
  }),
  ...gtec.institutions,
];

export const universities: University[] = allUniversities
  .filter((u) => !overrides.universities[u.slug]?.hidden)
  .map((u) => {
    const edits = Object.entries(overrides.universities[u.slug] ?? {}).filter(
      ([k, v]) => k !== "hidden" && v !== undefined && v !== "",
    );
    return { ...u, ...Object.fromEntries(edits) };
  });

/** Date the GTEC register was last crawled, or "" if it hasn't been. */
export const gtecFetched = gtec.fetched;

export const subjects = subjectsJson as {
  core: string[];
  tracks: Record<string, string[]>;
  aliases: Record<string, string>;
};
const visibleSlugs = new Set(universities.map((u) => u.slug));

export const postgradProgrammes = [
  ...(postgradJson as PostgradProgramme[]),
  ...gtecPostgradData.programmes,
].filter((p) => !p.university || visibleSlugs.has(p.university));
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
  return gtecProgrammeData.programmes.map((g) => {
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

/** Every institution and programme before admin edits are applied (for the admin editor). */
export const adminUniversities = allUniversities;
export const adminProgrammes: Programme[] = [...expandOfferings(), ...expandGtecProgrammes()];

export const programmes: Programme[] = adminProgrammes
  .filter((p) => visibleSlugs.has(p.university) && !overrides.programmes[p.id]?.hidden)
  .map((p) => {
    const edit = overrides.programmes[p.id];
    // An admin-entered cut-off counts as verified.
    return edit && edit.cutoff !== undefined ? { ...p, cutoff: edit.cutoff, verified: edit.cutoff !== null } : p;
  });

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
