import { readOverrides, writeOverrides } from "@/lib/admin-files";
import { requireAdmin } from "@/lib/admin";
import { adminProgrammes, adminUniversities } from "@/lib/data";
import { UNIVERSITY_FIELDS, type ProgrammeOverride, type UniversityOverride } from "@/lib/overrides";

const universityIds = new Set(adminUniversities.map((u) => u.slug));
const programmeIds = new Set(adminProgrammes.map((p) => p.id));

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return Response.json(readOverrides());
}

/**
 * Save one edit: { kind: "university" | "programme", id, patch } where patch null removes all edits
 * for that item. Changes go live after an "Apply changes" job rebuilds the site.
 */
export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  const id = String(body?.id ?? "").slice(0, 160);
  if (!id || (kind !== "university" && kind !== "programme")) return Response.json({ error: "Invalid request" }, { status: 400 });
  if (!(kind === "university" ? universityIds : programmeIds).has(id)) {
    return Response.json({ error: `Unknown ${kind}: ${id}` }, { status: 404 });
  }

  const o = readOverrides();
  const patch = body?.patch;

  if (kind === "university") {
    if (patch === null) delete o.universities[id];
    else {
      const next: UniversityOverride = {};
      for (const f of UNIVERSITY_FIELDS) {
        const v = patch?.[f];
        if (typeof v !== "string" || !v.trim()) continue;
        if ((f === "website" || f === "admissionsUrl") && !/^https?:\/\//i.test(v.trim())) {
          return Response.json({ error: `${f === "website" ? "Website" : "Admissions link"} must start with http:// or https://` }, { status: 400 });
        }
        next[f] = v.trim().slice(0, f === "description" ? 600 : 300);
      }
      if (patch?.hidden === true) next.hidden = true;
      if (Object.keys(next).length) o.universities[id] = next;
      else delete o.universities[id];
    }
  } else {
    if (patch === null) delete o.programmes[id];
    else {
      const next: ProgrammeOverride = {};
      if (patch?.cutoff === null) next.cutoff = null;
      else if (patch?.cutoff !== undefined && patch?.cutoff !== "") {
        const c = Number(patch.cutoff);
        if (!Number.isInteger(c) || c < 6 || c > 54) return Response.json({ error: "Cut-off must be a whole number from 6 to 54" }, { status: 400 });
        next.cutoff = c;
      }
      if (patch?.hidden === true) next.hidden = true;
      if (Object.keys(next).length) o.programmes[id] = next;
      else delete o.programmes[id];
    }
  }

  writeOverrides(o);
  return Response.json({ ok: true, overrides: readOverrides() });
}
