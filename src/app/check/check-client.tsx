"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ListPlus, Plus, Search, Share2, Users, X } from "lucide-react";
import { cleanSittings, GradeEditor, newSitting } from "@/components/grade-editor";
import { CHANCE_META, ChanceBadge, SaveButton, useOutcomeStats, useSaved, useTracker } from "@/components/ui";
import { FIELD_LABELS, programmes, REGIONS, universityBySlug } from "@/lib/data";
import { CHANCE_ORDER, checkProgramme, defaultMaxAggregate, generalAggregate } from "@/lib/eligibility";
import { EXAM_LABELS } from "@/lib/grades";
import { KEYS, usePersisted } from "@/lib/store";
import type { Chance, EligibilityResult, Field, Sitting } from "@/lib/types";

interface Filters {
  q: string;
  field: Field | "all";
  region: string;
  type: "all" | "public" | "private" | "technical";
  level: "all" | "degree" | "hnd" | "diploma";
  chance: Chance | "possible" | "all";
}

const DEFAULT_FILTERS: Filters = { q: "", field: "all", region: "all", type: "all", level: "all", chance: "possible" };

export function CheckClient() {
  const params = useSearchParams();
  const [sittings, setSittings, hydrated] = usePersisted<Sitting[]>(KEYS.sittings, []);
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    field: (params.get("field") as Field) ?? "all",
  }));
  const [activeTab, setActiveTab] = useState(0);
  const [editing, setEditing] = useState(true);
  const stats = useOutcomeStats();
  const saved = useSaved(KEYS.savedProgrammes);
  const tracker = useTracker();

  const [fallback] = useState(() => newSitting());
  const list = sittings.length ? sittings : [fallback];
  const current = list[Math.min(activeTab, list.length - 1)];
  const clean = useMemo(() => cleanSittings(sittings), [sittings]);
  const aggregate = useMemo(() => generalAggregate(clean), [clean]);
  const filled = clean.some((s) => Object.keys(s.grades).length >= 7);

  const results = useMemo<EligibilityResult[]>(() => {
    if (!filled) return [];
    return programmes.map((p) => checkProgramme(clean, p, universityBySlug.get(p.university)));
  }, [clean, filled]);

  const counts = useMemo(() => {
    const c: Record<Chance, number> = { safe: 0, competitive: 0, reach: 0, unlikely: 0, ineligible: 0 };
    for (const r of results) c[r.chance]++;
    return c;
  }, [results]);

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return results
      .filter((r) => {
        const p = r.programme;
        const u = universityBySlug.get(p.university)!;
        if (filters.chance === "possible" && !["safe", "competitive", "reach"].includes(r.chance)) return false;
        if (filters.chance !== "possible" && filters.chance !== "all" && r.chance !== filters.chance) return false;
        if (filters.field !== "all" && p.field !== filters.field) return false;
        if (filters.region !== "all" && u.region !== filters.region) return false;
        if (filters.type !== "all" && u.type !== filters.type) return false;
        if (filters.level !== "all" && p.level !== filters.level) return false;
        if (q && !`${p.name} ${u.name} ${u.short} ${p.careers.join(" ")}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => CHANCE_ORDER.indexOf(a.chance) - CHANCE_ORDER.indexOf(b.chance) || (a.programme.cutoff ?? 99) - (b.programme.cutoff ?? 99));
  }, [results, filters]);

  const update = (s: Sitting) => setSittings(list.map((x) => (x.id === s.id ? s : x)));
  const addSitting = () => {
    setSittings([...list, newSitting("novdec")]);
    setActiveTab(list.length);
  };
  const removeSitting = (id: string) => {
    setSittings(list.filter((x) => x.id !== id));
    setActiveTab(0);
  };

  const share = async () => {
    const possible = counts.safe + counts.competitive + counts.reach;
    const text = `My WASSCE aggregate is ${aggregate ?? "-"} and I qualify for ${possible} university programmes in Ghana. Check yours free:`;
    const url = window.location.origin + "/check";
    try {
      if (navigator.share) await navigator.share({ title: "UniChecker.gh", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        alert("Copied - paste it on WhatsApp!");
      }
    } catch {}
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      {/* Grade entry */}
      <section className="card h-fit lg:sticky lg:top-20">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your grades</h2>
          <button className="text-sm font-medium text-brand lg:hidden" onClick={() => setEditing((e) => !e)}>
            {editing ? "Hide" : "Edit"}
          </button>
        </div>

        <div className={`${editing ? "" : "hidden"} lg:block`}>
          <div className="mb-4 flex flex-wrap gap-2" role="tablist">
            {list.map((s, i) => (
              <div key={s.id} className={`chip !py-1.5 ${i === activeTab ? "chip-active" : ""}`}>
                <button role="tab" aria-selected={i === activeTab} onClick={() => setActiveTab(i)}>
                  {s.exam === "wassce" ? "WASSCE" : s.exam === "novdec" ? "NOVDEC" : "SSSCE"} {s.year}
                </button>
                {list.length > 1 && (
                  <button aria-label="Remove sitting" onClick={() => removeSitting(s.id)} className="hover:text-danger">
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
            {list.length < 4 && (
              <button className="chip hover:border-brand hover:text-brand" onClick={addSitting}>
                <Plus size={13} /> Add another sitting
              </button>
            )}
          </div>
          {hydrated ? <GradeEditor key={current.id} sitting={current} onChange={update} /> : <div className="h-96 animate-pulse rounded-xl bg-surface-2" />}
          <p className="mt-4 text-xs text-muted">
            Saved on this device automatically. <Link href="/results" className="text-brand underline">Import from your result slip</Link> instead.
          </p>
        </div>
      </section>

      {/* Results */}
      <section className="min-w-0 space-y-4">
        <div className="card flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
              <div className="text-center">
                <div className="text-3xl font-bold leading-none">{aggregate ?? "--"}</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide">Aggregate</div>
              </div>
            </div>
            <div>
              <p className="font-semibold">{filled ? "Your best 6 subjects" : "Enter at least 7 grades to see your matches"}</p>
              <p className="text-sm text-muted">
                English + Core Maths + best of Science/Social + best 3 electives. Each programme below uses its own required subjects.
              </p>
            </div>
          </div>
          {filled && (
            <button className="btn-ghost sm:ml-auto" onClick={share}>
              <Share2 size={16} /> Share
            </button>
          )}
        </div>

        {filled && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {CHANCE_ORDER.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilters((f) => ({ ...f, chance: f.chance === c ? "possible" : c }))}
                  className={`rounded-xl border p-3 text-left transition ${filters.chance === c ? "border-brand ring-2 ring-brand/20" : "border-border bg-surface hover:bg-surface-2"}`}
                >
                  <div className="text-2xl font-bold" style={{ color: `var(--${c})` }}>{counts[c]}</div>
                  <div className="text-xs font-medium text-muted">{CHANCE_META[c].label}</div>
                </button>
              ))}
            </div>

            <Toolbar filters={filters} setFilters={setFilters} />

            <p className="text-sm text-muted">
              Showing {visible.length} programme{visible.length === 1 ? "" : "s"}
              {filters.chance === "possible" ? " you have a real chance at" : ""}.
            </p>

            <div className="space-y-3">
              {visible.map((r) => (
                <ResultCard
                  key={r.programme.id}
                  r={r}
                  crowd={stats[r.programme.id]}
                  saved={saved.has(r.programme.id)}
                  onSave={() => saved.toggle(r.programme.id)}
                  tracked={tracker.has(r.programme.id)}
                  onTrack={() =>
                    tracker.add({ kind: "programme", refId: r.programme.id, title: r.programme.name, institution: universityBySlug.get(r.programme.university)!.short })
                  }
                />
              ))}
              {visible.length === 0 && (
                <div className="card text-center text-muted">
                  No programmes match these filters.{" "}
                  <button className="font-medium text-brand" onClick={() => setFilters({ ...DEFAULT_FILTERS, chance: "all" })}>
                    Show everything
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {!filled && <EmptyState />}
      </section>
    </div>
  );
}

function Toolbar({ filters, setFilters }: { filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>> }) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  return (
    <div className="card grid gap-2 !p-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="relative sm:col-span-2 xl:col-span-4">
        <span className="sr-only">Search</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input !pl-9" placeholder="Search programme or career" value={filters.q} onChange={(e) => set("q", e.target.value)} />
      </label>
      <select className="input" aria-label="Field" value={filters.field} onChange={(e) => set("field", e.target.value as Filters["field"])}>
        <option value="all">All fields</option>
        {(Object.keys(FIELD_LABELS) as Field[]).map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
      </select>
      <select className="input" aria-label="Region" value={filters.region} onChange={(e) => set("region", e.target.value)}>
        <option value="all">All regions</option>
        {REGIONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <select className="input" aria-label="Institution type" value={filters.type} onChange={(e) => set("type", e.target.value as Filters["type"])}>
        <option value="all">Public, private & technical</option>
        <option value="public">Public universities</option>
        <option value="private">Private universities</option>
        <option value="technical">Technical universities</option>
      </select>
      <select className="input" aria-label="Level" value={filters.level} onChange={(e) => set("level", e.target.value as Filters["level"])}>
        <option value="all">Degree, HND & diploma</option>
        <option value="degree">Degree</option>
        <option value="hnd">HND</option>
        <option value="diploma">Diploma</option>
      </select>
    </div>
  );
}

function ResultCard({
  r, crowd, saved, onSave, tracked, onTrack,
}: {
  r: EligibilityResult;
  crowd?: { n: number; admitted: number; bestAdmitted: number | null; worstAdmitted: number | null };
  saved: boolean;
  onSave: () => void;
  tracked: boolean;
  onTrack: () => void;
}) {
  const [open, setOpen] = useState(false);
  const p = r.programme;
  const u = universityBySlug.get(p.university)!;
  return (
    <article className="card !p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p.name}</h3>
            <ChanceBadge chance={r.chance} />
          </div>
          <p className="mt-0.5 text-sm text-muted">
            <Link href={`/universities/${u.slug}`} className="hover:text-brand hover:underline">{u.name}</Link> · {u.city}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-muted">You / cut-off</div>
          <div className="font-mono text-lg font-semibold">
            {r.aggregate ?? "--"} <span className="text-muted">/ {p.cutoff ?? defaultMaxAggregate(p)}</span>
          </div>
        </div>
      </div>

      {r.reasons.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {r.reasons.map((x) => (
            <li key={x} className={r.chance === "ineligible" ? "text-danger" : "text-muted"}>• {x}</li>
          ))}
        </ul>
      )}

      {crowd && crowd.admitted > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-muted">
          <Users size={13} /> {crowd.admitted} student{crowd.admitted === 1 ? "" : "s"} reported admission with aggregates {crowd.bestAdmitted}-{crowd.worstAdmitted}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-3">
        <SaveButton active={saved} onClick={onSave} />
        <button
          type="button"
          onClick={onTrack}
          disabled={tracked}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-foreground disabled:text-brand"
        >
          <ListPlus size={15} /> {tracked ? "In my plan" : "Add to plan"}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2">
          Details <ChevronDown size={14} className={open ? "rotate-180 transition" : "transition"} />
        </button>
      </div>

      {open && (
        <div className="mt-3 grid gap-4 rounded-xl bg-surface-2/60 p-3 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium">Subjects counted</p>
            <ul className="mt-1 text-muted">
              {r.counted.map((c) => <li key={c.subject}>{c.subject}: <span className="font-mono">{c.grade}</span></li>)}
            </ul>
            {r.usedCombinedSittings && <p className="mt-2 text-xs text-muted">Uses your best grades across sittings (allowed by {u.short}).</p>}
          </div>
          <div className="space-y-2 text-muted">
            <p><span className="font-medium text-foreground">Requirements:</span> {describeRequirements(p)}</p>
            <p><span className="font-medium text-foreground">Duration:</span> {p.years} years · {p.level.toUpperCase()}</p>
            <p><span className="font-medium text-foreground">Careers:</span> {p.careers.join(", ")}</p>
            {p.note && <p>{p.note}</p>}
            <p className="text-xs">
              Cut-off {p.verified ? "verified" : "is an estimate"}{p.lastChecked ? ` (checked ${p.lastChecked})` : ""}.{" "}
              <a href={u.admissionsUrl} target="_blank" rel="noreferrer" className="text-brand underline">Official admissions page</a>
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

export function describeRequirements(p: EligibilityResult["programme"]): string {
  const core = p.core === "science" ? "Credits in English, Core Maths and Integrated Science" : p.core === "social" ? "Credits in English, Core Maths and Social Studies" : "Credits in English, Core Maths and Integrated Science or Social Studies";
  const groups = p.groups.map((g) => (g.count === 1 ? g.anyOf.join("/") : `${g.count} of ${g.anyOf.join("/")}`));
  const fill = p.fillFrom === null ? "any other elective(s)" : p.fillFrom.length ? `others from ${p.fillFrom.join(", ")}` : "";
  const electives = [...groups, fill].filter(Boolean).join(" + ");
  const mins = Object.entries(p.minGrades ?? {}).map(([s, g]) => `${g}+ in ${s}`).join(", ");
  return `${core}; electives: ${electives || "any three"}${mins ? `; minimum ${mins}` : ""}. Max aggregate ${defaultMaxAggregate(p)}.`;
}

function EmptyState() {
  return (
    <div className="card space-y-3">
      <h3 className="font-semibold">How it works</h3>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted">
        <li>Pick your SHS programme to pre-fill your electives, then choose your grades.</li>
        <li>Rewrote some papers in NOVDEC? Add another sitting and we&apos;ll combine your best grades where the university allows it.</li>
        <li>See every programme sorted into Safe, Competitive and Reach, with clear reasons when you don&apos;t qualify.</li>
      </ol>
      <p className="text-xs text-muted">Supports {Object.values(EXAM_LABELS).join(", ")}.</p>
    </div>
  );
}
