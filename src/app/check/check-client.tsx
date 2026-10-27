"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ListPlus, Pencil, Plus, Search, Share2, Sparkles, Target, Users, X } from "lucide-react";
import { cleanSittings, GradeEditor, newSitting } from "@/components/grade-editor";
import { CHANCE_META, ChanceBadge, Pagination, SaveButton, useOutcomeStats, useSaved, useTracker } from "@/components/ui";
import { DonationPrompt } from "@/components/support";
import { FIELD_LABELS, programmes, REGIONS, TYPE_LABELS, TYPE_ORDER, universityBySlug } from "@/lib/data";
import { CHANCE_ORDER, checkProgramme, defaultMaxAggregate, generalAggregate } from "@/lib/eligibility";
import { EXAM_LABELS } from "@/lib/grades";
import { KEYS, usePersisted } from "@/lib/store";
import type { Chance, EligibilityResult, Field, InstitutionType, Sitting } from "@/lib/types";
import { SITE_TITLE } from "@/lib/site";
import { track } from "@/lib/telemetry";
import { aggregateBand } from "@/lib/telemetry-events";
import { recommend, type Recommendation } from "@/lib/recommend";

interface Filters {
  q: string;
  field: Field | "all";
  region: string;
  type: "all" | InstitutionType;
  level: "all" | "degree" | "hnd" | "diploma";
  chance: Chance | "possible" | "all";
}

const PAGE_SIZE = 20;

const POSSIBLE: Chance[] = ["safe", "competitive", "reach", "eligible"];

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
  // Decided once on arrival: visitors with enough grades saved land on step 2, everyone else on step 1.
  // After that the step only changes when the visitor moves between steps.
  const [step, setStep] = useState<Step>(initialStep);
  // Step 3: optional field (remembered) and region for recommendations.
  const [recField, setRecField] = usePersisted<Field | "any">(KEYS.recField, "any");
  const [recRegion, setRecRegion] = useState<string>("any");
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
    const c: Record<Chance, number> = { safe: 0, competitive: 0, reach: 0, eligible: 0, unlikely: 0, ineligible: 0 };
    for (const r of results) c[r.chance]++;
    return c;
  }, [results]);

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return results
      .filter((r) => {
        const p = r.programme;
        const u = universityBySlug.get(p.university)!;
        if (filters.chance === "possible" && !POSSIBLE.includes(r.chance)) return false;
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

  // The page resets to 1 whenever the result set changes (new grades or filters).
  const resultsKey = useMemo(() => JSON.stringify([filters, clean]), [filters, clean]);
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const page = pageState.key === resultsKey ? Math.min(pageState.page, pageCount) : 1;
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const listTop = useRef<HTMLParagraphElement>(null);
  const goToPage = (p: number) => {
    setPageState({ key: resultsKey, page: p });
    listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToStep = (next: Step) => {
    // Arriving from the career quiz (?field=...) pre-selects that field the first time.
    if (next === 3 && recField === "any" && filters.field !== "all") setRecField(filters.field);
    setStep(next);
    // On phones, step 2 opens on the results; the grades can be reopened with "Edit".
    if (next === 2) setEditing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const gradedCount = Object.values(current.grades).filter(Boolean).length;

  const update = (s: Sitting) => setSittings(list.map((x) => (x.id === s.id ? s : x)));
  const addSitting = () => {
    setSittings([...list, newSitting("novdec")]);
    setActiveTab(list.length);
  };
  const removeSitting = (id: string) => {
    setSittings(list.filter((x) => x.id !== id));
    setActiveTab(0);
  };

  const recs = useMemo(
    () => recommend(results, { field: recField, region: recRegion, universities: universityBySlug }),
    [results, recField, recRegion],
  );

  // One "check_results" statistic per visit, once results first appear (not on every grade edit).
  const reportedCheck = useRef(false);
  useEffect(() => {
    if (!filled || results.length === 0 || reportedCheck.current) return;
    reportedCheck.current = true;
    track("check_results", { exam: clean[0]?.exam ?? "wassce", aggregate_band: aggregateBand(aggregate), sittings: clean.length });
  }, [filled, results.length, clean, aggregate]);

  const share = async () => {
    track("share");
    const possible = counts.safe + counts.competitive + counts.reach + counts.eligible;
    const text = `My WASSCE aggregate is ${aggregate ?? "-"} and I qualify for ${possible} university programmes in Ghana. Check yours free:`;
    const url = window.location.origin + "/check";
    try {
      if (navigator.share) await navigator.share({ title: SITE_TITLE, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        alert("Copied - paste it on WhatsApp!");
      }
    } catch {}
  };

  const gradesEditor = (
    <>
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
        <button className="chip !py-1.5" onClick={addSitting}>
          <Plus size={13} /> Add another sitting
        </button>
      )}
    </div>
    {hydrated ? <GradeEditor key={current.id} sitting={current} onChange={update} /> : <div className="h-96 animate-pulse rounded-xl bg-surface-2" />}
    <p className="mt-4 text-xs text-muted">
      Saved on this device automatically. <Link href="/results" className="text-brand underline">Import from your result slip</Link> instead.
    </p>
    </>
  );

  if (!hydrated) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />;

  if (step === 1) {
    const needed = Math.max(0, 7 - gradedCount);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <StepIndicator step={1} canSeeResults={filled} onStep={goToStep} />
        <section className="card space-y-5">
          <div>
            <h2 className="text-xl font-semibold">Enter your results</h2>
            <p className="mt-1 text-sm text-muted">
              Choose your exam, tap your SHS programme to fill in your electives, then pick a grade for each subject. It takes
              about a minute and stays on this device.
            </p>
          </div>
          {gradesEditor}
        </section>
        <div className="card sticky bottom-20 z-30 flex flex-col gap-3 !p-4 shadow-lg sm:flex-row sm:items-center lg:bottom-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{filled ? "Ready to see your matches" : `${needed} more grade${needed === 1 ? "" : "s"} needed`}</span>
              <span className="text-muted">{gradedCount} entered</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={8} aria-valuenow={Math.min(gradedCount, 8)}>
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(Math.min(gradedCount, 8) / 8) * 100}%` }} />
            </div>
          </div>
          <button className="btn-primary sm:w-auto" disabled={!filled} onClick={() => goToStep(2)}>
            See my results <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (step === 3 && filled) {
    const total = recs.strong.length + recs.ambitious.length + recs.backup.length;
    const cardProps = (r: Recommendation) => ({
      rec: r,
      saved: saved.has(r.result.programme.id),
      onSave: () => {
        if (!saved.has(r.result.programme.id)) track("save_programme");
        saved.toggle(r.result.programme.id);
      },
      tracked: tracker.has(r.result.programme.id),
      onTrack: () => {
        track("add_to_plan", { kind: "programme" });
        tracker.add({ kind: "programme", refId: r.result.programme.id, title: r.result.programme.name, institution: universityBySlug.get(r.result.programme.university)!.short });
      },
    });
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <StepIndicator step={3} canSeeResults={filled} onStep={goToStep} />

        <section className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold"><Sparkles size={20} className="text-accent" /> Your recommendations</h2>
              <p className="mt-1 text-sm text-muted">
                Based on your aggregate of <strong className="text-foreground">{aggregate ?? "--"}</strong> and each programme&apos;s subject
                requirements. Pick a field you&apos;re interested in, or leave it open.
              </p>
            </div>
            <select className={`input w-auto ${recRegion !== "any" ? "input-active" : ""}`} aria-label="Region" value={recRegion} onChange={(e) => setRecRegion(e.target.value)}>
              <option value="any">Anywhere in Ghana</option>
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <p className="label">What would you like to study? <span className="font-normal text-muted">(optional)</span></p>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={recField === "any"} className={`chip !py-1.5 ${recField === "any" ? "chip-active" : ""}`} onClick={() => setRecField("any")}>
                Open to anything
              </button>
              {recs.fieldCounts.map(({ field, count }) => (
                <button
                  key={field}
                  type="button"
                  aria-pressed={recField === field}
                  className={`chip !py-1.5 ${recField === field ? "chip-active" : ""}`}
                  onClick={() => setRecField(field)}
                >
                  {FIELD_LABELS[field]} <span className="opacity-70">· {count}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              Numbers show how many programmes you have a real chance at in each field. Not sure?{" "}
              <Link href="/career" className="text-brand underline">Take the 2-minute career quiz</Link>.
            </p>
          </div>
        </section>

        {total === 0 ? (
          <div className="card space-y-2 text-sm text-muted">
            <p>No realistic matches for this choice{recRegion !== "any" ? ` in ${recRegion}` : ""}.</p>
            <p>Try another field above{recRegion !== "any" ? " or widen the region" : ""}, or see every option in step 2.</p>
          </div>
        ) : (
          <>
            <RecommendationGroupView
              icon={<Target size={18} className="text-[var(--safe)]" />}
              title="Strong picks"
              hint="The most selective programmes your aggregate clears. Put your favourites here first."
              items={recs.strong}
              cardProps={cardProps}
            />
            <RecommendationGroupView
              icon={<Sparkles size={18} className="text-[var(--reach)]" />}
              title="Ambitious"
              hint="Just outside last year's cut-off. Worth a choice if you're prepared for a no."
              items={recs.ambitious}
              cardProps={cardProps}
            />
            <RecommendationGroupView
              icon={<Check size={18} className="text-[var(--competitive)]" />}
              title="Safe backups"
              hint="Comfortably within reach, so you're not left without an admission."
              items={recs.backup}
              cardProps={cardProps}
            />
          </>
        )}

        <div className="flex flex-wrap justify-between gap-2">
          <button className="btn-ghost" onClick={() => goToStep(2)}><ArrowLeft size={16} /> All {counts.safe + counts.competitive + counts.reach + counts.eligible} matches</button>
          <Link href="/plan" className="btn-primary">Open my plan <ArrowRight size={16} /></Link>
        </div>
        <p className="text-xs text-muted">Recommendations use last year&apos;s cut-offs where known; cut-offs change every year, so always confirm with the university.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepIndicator step={2} canSeeResults={filled} onStep={goToStep} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* Grade entry */}
        <section className="card h-fit sticky-panel">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your grades</h2>
            <div className="flex items-center gap-3">
              <button className="hidden items-center gap-1 text-sm font-medium text-muted hover:text-brand lg:inline-flex" onClick={() => goToStep(1)}>
                <Pencil size={14} /> Step by step
              </button>
              <button className="text-sm font-medium text-brand lg:hidden" onClick={() => setEditing((e) => !e)}>
                {editing ? "Hide" : "Edit"}
              </button>
            </div>
          </div>

          <div className={`${editing ? "" : "hidden"} lg:block`}>
            {gradesEditor}
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
              <div className="flex gap-2 sm:ml-auto">
                <button className="btn-ghost" onClick={share}>
                  <Share2 size={16} /> Share
                </button>
                <button className="btn-primary" onClick={() => goToStep(3)}>
                  <Sparkles size={16} /> Recommendations
                </button>
              </div>
            )}
          </div>

          {filled && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
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

              <p ref={listTop} className="scroll-mt-24 text-sm text-muted">
                {visible.length > PAGE_SIZE
                  ? `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, visible.length)} of ${visible.length} programmes`
                  : `Showing ${visible.length} programme${visible.length === 1 ? "" : "s"}`}
                {filters.chance === "possible" ? " you have a real chance at" : ""}.
              </p>

              <div className="space-y-3">
                {pageItems.map((r) => (
                  <ResultCard
                    key={r.programme.id}
                    r={r}
                    crowd={stats[r.programme.id]}
                    saved={saved.has(r.programme.id)}
                    onSave={() => {
                      if (!saved.has(r.programme.id)) track("save_programme");
                      saved.toggle(r.programme.id);
                    }}
                    tracked={tracker.has(r.programme.id)}
                    onTrack={() => {
                      track("add_to_plan", { kind: "programme" });
                      tracker.add({ kind: "programme", refId: r.programme.id, title: r.programme.name, institution: universityBySlug.get(r.programme.university)!.short });
                    }}
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

              <Pagination page={page} pageCount={pageCount} onPage={goToPage} />
            </>
          )}

          {!filled && <EmptyState onBack={() => goToStep(1)} />}
        </section>
        <DonationPrompt active={filled && visible.length > 0} />
      </div>
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
        <input className={`input !pl-9 ${filters.q ? "input-active" : ""}`} placeholder="Search programme or career" value={filters.q} onChange={(e) => set("q", e.target.value)} />
      </label>
      <select className={`input ${filters.field !== "all" ? "input-active" : ""}`} aria-label="Field" value={filters.field} onChange={(e) => set("field", e.target.value as Filters["field"])}>
        <option value="all">All fields</option>
        {(Object.keys(FIELD_LABELS) as Field[]).map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
      </select>
      <select className={`input ${filters.region !== "all" ? "input-active" : ""}`} aria-label="Region" value={filters.region} onChange={(e) => set("region", e.target.value)}>
        <option value="all">All regions</option>
        {REGIONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <select className={`input ${filters.type !== "all" ? "input-active" : ""}`} aria-label="Institution type" value={filters.type} onChange={(e) => set("type", e.target.value as Filters["type"])}>
        <option value="all">All institution types</option>
        {TYPE_ORDER.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
      </select>
      <select className={`input ${filters.level !== "all" ? "input-active" : ""}`} aria-label="Level" value={filters.level} onChange={(e) => set("level", e.target.value as Filters["level"])}>
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
          <div className="text-xs text-muted">{p.cutoff === null ? "You / max" : "You / cut-off"}</div>
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
              {p.cutoff === null ? "No cut-off data yet" : `Cut-off ${p.verified ? "verified" : "is an estimate"}${p.lastChecked ? ` (checked ${p.lastChecked})` : ""}`}.
              {p.accreditedTo ? ` Accredited by GTEC until ${p.accreditedTo}.` : ""}{" "}
              <a href={u.admissionsUrl} target="_blank" rel="noreferrer" className="text-brand underline">
                {u.website ? "Official admissions page" : "GTEC accreditation listing"}
              </a>
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

export function describeRequirements(p: EligibilityResult["programme"]): string {
  if (!p.requirementsKnown) {
    return `Specific subjects not yet in our data. General rule: credits (C6 or better) in English, Core Maths, Integrated Science or Social Studies and three electives, aggregate ${defaultMaxAggregate(p)} or better.`;
  }
  const core = p.core === "science" ? "Credits in English, Core Maths and Integrated Science" : p.core === "social" ? "Credits in English, Core Maths and Social Studies" : "Credits in English, Core Maths and Integrated Science or Social Studies";
  const groups = p.groups.map((g) => (g.count === 1 ? g.anyOf.join("/") : `${g.count} of ${g.anyOf.join("/")}`));
  const fill = p.fillFrom === null ? "any other elective(s)" : p.fillFrom.length ? `others from ${p.fillFrom.join(", ")}` : "";
  const electives = [...groups, fill].filter(Boolean).join(" + ");
  const mins = Object.entries(p.minGrades ?? {}).map(([s, g]) => `${g}+ in ${s}`).join(", ");
  return `${core}; electives: ${electives || "any three"}${mins ? `; minimum ${mins}` : ""}. Max aggregate ${defaultMaxAggregate(p)}.`;
}

type Step = 1 | 2 | 3;

/** Step to open on: 2 if this device already has a sitting with 7+ grades. Server render shows a skeleton. */
function initialStep(): Step {
  if (typeof window === "undefined") return 1;
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEYS.sittings) ?? "null") as { v?: Sitting[] } | null;
    return saved?.v?.some((s) => Object.values(s.grades ?? {}).filter(Boolean).length >= 7) ? 2 : 1;
  } catch {
    return 1;
  }
}

function StepIndicator({ step, canSeeResults, onStep }: { step: Step; canSeeResults: boolean; onStep: (s: Step) => void }) {
  const steps = [
    { n: 1 as const, title: "Enter your grades", sub: "WASSCE, NOVDEC or SSSCE" },
    { n: 2 as const, title: "See your matches", sub: "Results and edits side by side" },
    { n: 3 as const, title: "Get recommendations", sub: "A shortlist for your field" },
  ];
  return (
    <ol className="mx-auto flex max-w-4xl items-center gap-2 sm:gap-3" aria-label="Steps">
      {steps.map((st, i) => {
        const active = st.n === step;
        const done = st.n < step;
        const reachable = st.n === 1 || canSeeResults;
        return (
          <li key={st.n} className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              disabled={!reachable || active}
              onClick={() => onStep(st.n)}
              aria-current={active ? "step" : undefined}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-2xl border p-2.5 text-left transition sm:gap-3 sm:p-3 ${
                active ? "border-brand bg-brand-soft" : "border-border bg-surface enabled:hover:border-brand/50"
              } disabled:cursor-default`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  active ? "bg-brand text-white dark:text-[#0d0f1c]" : done ? "bg-[var(--safe)] text-white" : "bg-surface-2 text-muted"
                }`}
              >
                {done && !active ? <Check size={16} /> : st.n}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold leading-tight ${active ? "text-brand" : ""}`}>{st.title}</span>
                <span className="hidden truncate text-xs text-muted sm:block">{st.sub}</span>
              </span>
            </button>
            {i < steps.length - 1 && <span className="hidden h-px w-6 shrink-0 bg-border sm:block" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

interface RecCardProps {
  rec: Recommendation;
  saved: boolean;
  onSave: () => void;
  tracked: boolean;
  onTrack: () => void;
}

function RecommendationGroupView({ icon, title, hint, items, cardProps }: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  items: Recommendation[];
  cardProps: (r: Recommendation) => RecCardProps;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold">{icon} {title} <span className="text-sm font-normal text-muted">({items.length})</span></h3>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((r) => <RecommendationCard key={r.result.programme.id} {...cardProps(r)} />)}
      </div>
    </section>
  );
}

function RecommendationCard({ rec, saved, onSave, tracked, onTrack }: RecCardProps) {
  const p = rec.result.programme;
  const u = universityBySlug.get(p.university)!;
  return (
    <article className="card flex flex-col !p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{p.name}</h4>
            <ChanceBadge chance={rec.result.chance} />
          </div>
          <p className="mt-0.5 text-sm text-muted">
            <Link href={`/universities/${u.slug}`} className="hover:text-brand hover:underline">{u.name}</Link> · {u.city}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-muted">{p.cutoff === null ? "You / max" : "You / cut-off"}</div>
          <div className="font-mono text-lg font-semibold">
            {rec.result.aggregate ?? "--"} <span className="text-muted">/ {p.cutoff ?? defaultMaxAggregate(p)}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-surface-2/70 px-3 py-2 text-sm">{rec.why}</p>
      {p.careers.length > 0 && <p className="mt-2 text-xs text-muted">Careers: {p.careers.slice(0, 3).join(", ")}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-1 pt-3">
        <SaveButton active={saved} onClick={onSave} />
        <button
          type="button"
          onClick={onTrack}
          disabled={tracked}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-foreground disabled:text-brand"
        >
          <ListPlus size={15} /> {tracked ? "In my plan" : "Add to plan"}
        </button>
      </div>
    </article>
  );
}

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="card space-y-3">
      <h3 className="font-semibold">How it works</h3>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted">
        <li>Pick your SHS programme to pre-fill your electives, then choose your grades.</li>
        <li>Rewrote some papers in NOVDEC? Add another sitting and we&apos;ll combine your best grades where the university allows it.</li>
        <li>See every programme sorted into Safe, Competitive and Reach, with clear reasons when you don&apos;t qualify.</li>
      </ol>
      <p className="text-xs text-muted">Supports {Object.values(EXAM_LABELS).join(", ")}.</p>
      <button className="btn-primary" onClick={onBack}>
        <ArrowLeft size={16} /> Enter grades step by step
      </button>
    </div>
  );
}
