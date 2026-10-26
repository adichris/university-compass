/** Admin edits stored in data/local/overrides.json and applied when the site is built. */
export interface UniversityOverride {
  name?: string;
  website?: string;
  admissionsUrl?: string;
  feesRange?: string;
  description?: string;
  hidden?: boolean;
}

export interface ProgrammeOverride {
  /** A cut-off aggregate, or null to clear a cut-off */
  cutoff?: number | null;
  hidden?: boolean;
}

export interface Overrides {
  updatedAt: string | null;
  universities: Record<string, UniversityOverride>;
  programmes: Record<string, ProgrammeOverride>;
}

export const UNIVERSITY_FIELDS = ["name", "website", "admissionsUrl", "feesRange", "description"] as const;
