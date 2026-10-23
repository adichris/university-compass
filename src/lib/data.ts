import universitiesJson from "../../data/universities.json";
import templatesJson from "../../data/programme-templates.json";
import offeringsJson from "../../data/offerings.json";
import postgradJson from "../../data/postgrad.json";
import scholarshipsJson from "../../data/scholarships.json";
import updatesJson from "../../data/updates.json";
import subjectsJson from "../../data/subjects.json";
import type {
  Field,
  PostgradProgramme,
  Programme,
  ProgrammeTemplate,
  Scholarship,
  University,
  Update,
} from "./types";

type OfferingOverride = Partial<Omit<Programme, "id" | "template" | "university">> & { cutoff?: number | null };

export const universities = universitiesJson as University[];
export const subjects = subjectsJson as {
  core: string[];
  tracks: Record<string, string[]>;
  aliases: Record<string, string>;
};
export const postgradProgrammes = postgradJson as PostgradProgramme[];
export const scholarships = scholarshipsJson as Scholarship[];
export const updates = updatesJson as Update[];

const templates = Object.fromEntries(
  Object.entries(templatesJson).filter(([k]) => !k.startsWith("_")),
) as Record<string, ProgrammeTemplate>;

export const programmeTemplates = templates;

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
      });
    }
  }
  return out;
}

export const programmes = expandOfferings();

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

export const REGIONS = Array.from(new Set(universities.map((u) => u.region))).sort();
