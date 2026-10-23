"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, ListPlus } from "lucide-react";
import { SaveButton, useSaved, useTracker } from "@/components/ui";
import { FIELD_LABELS, postgradProgrammes, scholarships, universityBySlug } from "@/lib/data";
import { CLASS_LABELS, classFromCgpa, matchPostgrad, matchScholarship, type PgStatus } from "@/lib/postgrad";
import { KEYS, usePersisted } from "@/lib/store";
import type { DegreeClass, Field, PostgradProfile } from "@/lib/types";

const DEFAULT: PostgradProfile = {
  highest: "bachelor",
  degreeClass: "second-upper",
  field: "science",
  workYears: 0,
  hasProposal: false,
  ielts: null,
  target: "any",
  location: "any",
  age: null,
};

const STATUS: Record<PgStatus, { label: string; color: string }> = {
  eligible: { label: "You meet the requirements", color: "safe" },
  borderline: { label: "Borderline - possible", color: "reach" },
  "not-yet": { label: "Not yet", color: "ineligible" },
};

export function PostgradClient() {
  const [profile, setProfile] = usePersisted<PostgradProfile>(KEYS.pgProfile, DEFAULT);
  const [cgpa, setCgpa] = useState("");
  const [scale, setScale] = useState<4 | 5>(4);
  const [showAll, setShowAll] = useState(false);
  const saved = useSaved(KEYS.savedProgrammes);
  const tracker = useTracker();
  const set = <K extends keyof PostgradProfile>(k: K, v: PostgradProfile[K]) => setProfile({ ...profile, [k]: v });

  const results = useMemo(() => {
    const order: PgStatus[] = ["eligible", "borderline", "not-yet"];
    return postgradProgrammes
      .map((p) => matchPostgrad(profile, p))
      .filter((r) => !r.gaps.some((g) => ["Different level", "Abroad", "In Ghana"].includes(g)))
      .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  }, [profile]);
  const shown = showAll ? results : results.filter((r) => r.status !== "not-yet");

  const funding = useMemo(
    () =>
      scholarships
        .map((s) =>
          matchScholarship(
            {
              level: profile.target === "phd" ? "phd" : "masters",
              field: profile.field,
              destination: profile.location === "ghana" ? "Ghana" : "any",
              degreeClass: profile.degreeClass,
              workYears: profile.workYears,
              age: profile.age,
            },
            s,
          ),
        )
        .filter((m) => m.score >= 60)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6),
    [profile],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <section className="card h-fit space-y-4 lg:sticky lg:top-20">
        <h2 className="text-lg font-semibold">Your academic profile</h2>
        <div>
          <label className="label" htmlFor="highest">Highest qualification</label>
          <select id="highest" className="input" value={profile.highest} onChange={(e) => set("highest", e.target.value as PostgradProfile["highest"])}>
            <option value="bachelor">Bachelor&apos;s degree</option>
            <option value="masters">Master&apos;s degree</option>
            <option value="mphil">MPhil</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="class">Class of degree</label>
          <select id="class" className="input" value={profile.degreeClass} onChange={(e) => set("degreeClass", e.target.value as DegreeClass)}>
            {(Object.keys(CLASS_LABELS) as DegreeClass[]).map((c) => <option key={c} value={c}>{CLASS_LABELS[c]}</option>)}
          </select>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted">
            <span>Or from CGPA:</span>
            <input className="input w-20 !py-1.5" inputMode="decimal" placeholder="3.4" value={cgpa} onChange={(e) => setCgpa(e.target.value)} aria-label="CGPA" />
            <span>/</span>
            <select className="input w-16 !py-1.5" value={scale} onChange={(e) => setScale(Number(e.target.value) as 4 | 5)} aria-label="CGPA scale">
              <option value={4}>4.0</option>
              <option value={5}>5.0</option>
            </select>
            <button
              className="font-semibold text-brand disabled:opacity-40"
              disabled={!(Number(cgpa) > 0 && Number(cgpa) <= scale)}
              onClick={() => set("degreeClass", classFromCgpa(Number(cgpa), scale))}
            >
              Apply
            </button>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="field">Field of your degree</label>
          <select id="field" className="input" value={profile.field} onChange={(e) => set("field", e.target.value as Field)}>
            {(Object.keys(FIELD_LABELS) as Field[]).map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="work">Work experience (yrs)</label>
            <input id="work" type="number" min={0} max={40} className="input" value={profile.workYears} onChange={(e) => set("workYears", Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <label className="label" htmlFor="age">Age (optional)</label>
            <input id="age" type="number" min={16} max={80} className="input" value={profile.age ?? ""} onChange={(e) => set("age", e.target.value ? Number(e.target.value) : null)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="target">Looking for</label>
            <select id="target" className="input" value={profile.target} onChange={(e) => set("target", e.target.value as PostgradProfile["target"])}>
              <option value="any">Any level</option>
              <option value="masters">Master&apos;s (taught)</option>
              <option value="mphil">MPhil (research)</option>
              <option value="phd">PhD</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="where">Where</label>
            <select id="where" className="input" value={profile.location} onChange={(e) => set("location", e.target.value as PostgradProfile["location"])}>
              <option value="any">Ghana & abroad</option>
              <option value="ghana">Ghana only</option>
              <option value="abroad">Abroad only</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ielts">IELTS (optional)</label>
            <input id="ielts" type="number" step={0.5} min={0} max={9} className="input" value={profile.ielts ?? ""} onChange={(e) => set("ielts", e.target.value ? Number(e.target.value) : null)} />
          </div>
          <label className="mt-7 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={profile.hasProposal} onChange={(e) => set("hasProposal", e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
            I have a research proposal
          </label>
        </div>
      </section>

      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {results.filter((r) => r.status === "eligible").length} programmes match, {results.filter((r) => r.status === "borderline").length} borderline.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
            Show programmes I don&apos;t meet yet
          </label>
        </div>

        {shown.map(({ programme: p, status, gaps, notes }) => {
          const uni = p.university ? universityBySlug.get(p.university) : null;
          return (
            <article key={p.id} className="card !p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-sm text-muted">
                    {uni ? <Link href={`/universities/${uni.slug}`} className="hover:text-brand">{uni.name}</Link> : p.universityName} · {p.country}
                  </p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: `var(--${STATUS[status].color})`, background: `var(--${STATUS[status].color}-bg)` }}>
                  {STATUS[status].label}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="chip uppercase">{p.level}</span>
                <span className="chip">{p.durationYears} yr{p.durationYears === 1 ? "" : "s"}</span>
                <span className="chip">Min: {CLASS_LABELS[p.minClass]}</span>
                {p.workYears > 0 && <span className="chip">{p.workYears}+ yrs work</span>}
                {p.modes.map((m) => <span key={m} className="chip capitalize">{m}</span>)}
              </div>
              {(gaps.length > 0 || notes.length > 0) && (
                <ul className="mt-3 space-y-1 text-sm">
                  {gaps.map((g) => <li key={g} className="text-danger">• {g}</li>)}
                  {notes.map((n) => <li key={n} className="text-muted">• {n}</li>)}
                </ul>
              )}
              {p.note && <p className="mt-2 text-sm text-muted">{p.note}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-3">
                <SaveButton active={saved.has(p.id)} onClick={() => saved.toggle(p.id)} />
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 disabled:text-brand"
                  disabled={tracker.has(p.id)}
                  onClick={() => tracker.add({ kind: "postgrad", refId: p.id, title: p.name, institution: uni?.short ?? p.country })}
                >
                  <ListPlus size={15} /> {tracker.has(p.id) ? "In my plan" : "Add to plan"}
                </button>
                <a href={p.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand">
                  Official info <ExternalLink size={13} />
                </a>
              </div>
            </article>
          );
        })}
        {shown.length === 0 && <div className="card text-muted">No matches yet - try widening the level or location, or tick &quot;show programmes I don&apos;t meet yet&quot; to see what to work towards.</div>}

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Funding that fits you</h2>
            <Link href="/scholarships" className="text-sm font-semibold text-brand">All scholarships →</Link>
          </div>
          <ul className="divide-y divide-border">
            {funding.map(({ scholarship: s, score }) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <a href={s.url} target="_blank" rel="noreferrer" className="font-medium hover:text-brand">{s.name}</a>
                  <p className="text-muted">{s.destinations.join(", ")} · {s.deadlineWindow}</p>
                </div>
                <span className="shrink-0 font-mono text-xs font-semibold text-brand">{score}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
