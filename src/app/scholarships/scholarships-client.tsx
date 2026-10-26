"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, ExternalLink, ListPlus } from "lucide-react";
import { SaveButton, useSaved, useTracker } from "@/components/ui";
import { FIELD_LABELS, scholarships } from "@/lib/data";
import { downloadText, icsEvent } from "@/lib/ics";
import { CLASS_LABELS, matchScholarship, nextDeadline, type ScholarshipProfile } from "@/lib/postgrad";
import { KEYS } from "@/lib/store";
import type { DegreeClass, Field } from "@/lib/types";
import { track } from "@/lib/telemetry";

const DESTINATIONS = ["Ghana", "United Kingdom", "United States", "Germany", "Europe", "China", "Japan", "Australia", "Africa"];

export function ScholarshipsClient() {
  const [profile, setProfile] = useState<ScholarshipProfile>({ level: "any", field: "any", destination: "any", degreeClass: null, workYears: null, age: null, needBased: false });
  const [q, setQ] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);
  const saved = useSaved(KEYS.savedScholarships);
  const tracker = useTracker();
  const set = <K extends keyof ScholarshipProfile>(k: K, v: ScholarshipProfile[K]) => setProfile((p) => ({ ...p, [k]: v }));

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return scholarships
      .map((s) => matchScholarship(profile, s))
      .filter((m) => m.score > 0)
      .filter((m) => !needle || `${m.scholarship.name} ${m.scholarship.provider} ${m.scholarship.destinations.join(" ")}`.toLowerCase().includes(needle))
      .filter((m) => !onlySaved || saved.has(m.scholarship.id))
      .sort((a, b) => b.score - a.score);
  }, [profile, q, onlySaved, saved]);

  const remind = (id: string) => {
    const s = scholarships.find((x) => x.id === id)!;
    const date = nextDeadline(s.deadlineMonth)!;
    downloadText(`${s.id}-deadline.ics`, icsEvent({ title: `${s.name} deadline (approx.)`, date, description: `${s.deadlineWindow}. Confirm the exact date: ${s.url}`, url: s.url }));
  };

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 !p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input className={`input sm:col-span-2 lg:col-span-4 ${q ? "input-active" : ""}`} placeholder="Search scholarships, providers or countries" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search scholarships" />
        <select className={`input ${profile.level !== "any" ? "input-active" : ""}`} aria-label="Level" value={profile.level} onChange={(e) => set("level", e.target.value as ScholarshipProfile["level"])}>
          <option value="any">Any level</option>
          <option value="undergraduate">Undergraduate</option>
          <option value="masters">Master&apos;s</option>
          <option value="phd">PhD</option>
        </select>
        <select className={`input ${profile.field !== "any" ? "input-active" : ""}`} aria-label="Field" value={profile.field} onChange={(e) => set("field", e.target.value as Field | "any")}>
          <option value="any">Any field</option>
          {(Object.keys(FIELD_LABELS) as Field[]).map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
        </select>
        <select className={`input ${profile.destination !== "any" ? "input-active" : ""}`} aria-label="Destination" value={profile.destination} onChange={(e) => set("destination", e.target.value)}>
          <option value="any">Anywhere</option>
          {DESTINATIONS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className={`input ${profile.degreeClass ? "input-active" : ""}`} aria-label="Degree class" value={profile.degreeClass ?? ""} onChange={(e) => set("degreeClass", (e.target.value || null) as DegreeClass | null)}>
          <option value="">Degree class (if graduate)</option>
          {(Object.keys(CLASS_LABELS) as DegreeClass[]).map((c) => <option key={c} value={c}>{CLASS_LABELS[c]}</option>)}
        </select>
        <input className="input" type="number" min={0} placeholder="Years of work experience" aria-label="Work experience" value={profile.workYears ?? ""} onChange={(e) => set("workYears", e.target.value ? Number(e.target.value) : null)} />
        <input className="input" type="number" min={14} placeholder="Age" aria-label="Age" value={profile.age ?? ""} onChange={(e) => set("age", e.target.value ? Number(e.target.value) : null)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={profile.needBased} onChange={(e) => set("needBased", e.target.checked)} />
          I need financial support
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} />
          Saved only ({saved.saved.length})
        </label>
      </div>

      <p className="text-sm text-muted">{list.length} opportunities, best matches first. Deadlines are typical windows - always confirm on the official site.</p>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map(({ scholarship: s, score, issues }) => (
          <article key={s.id} className="card flex flex-col !p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                <p className="text-sm text-muted">{s.provider}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-lg font-bold text-brand">{score}%</div>
                <div className="text-[10px] uppercase text-muted">match</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.kind === "loan" && <span className="chip !border-accent !text-accent">Loan</span>}
              {s.levels.map((l) => <span key={l} className="chip capitalize">{l}</span>)}
              {s.destinations.map((d) => <span key={d} className="chip">{d}</span>)}
            </div>
            <p className="mt-3 text-sm">{s.eligibility}</p>
            <p className="mt-2 text-sm"><span className="font-medium">Covers:</span> <span className="text-muted">{s.coverage}</span></p>
            <p className="mt-1 text-sm"><span className="font-medium">Deadline:</span> <span className="text-muted">{s.deadlineWindow}</span></p>
            {issues.length > 0 && <ul className="mt-2 text-sm text-danger">{issues.map((i) => <li key={i}>• {i}</li>)}</ul>}
            <div className="min-h-4 flex-1" />
            <div className="flex flex-wrap items-center gap-1 border-t border-border pt-3">
              <SaveButton active={saved.has(s.id)} onClick={() => saved.toggle(s.id)} />
              <button
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2 disabled:text-brand"
                disabled={tracker.has(s.id)}
                onClick={() => (track("add_to_plan", { kind: "scholarship" }), tracker.add({ kind: "scholarship", refId: s.id, title: s.name, institution: s.provider, deadline: nextDeadline(s.deadlineMonth)?.toISOString().slice(0, 10) }))}
              >
                <ListPlus size={15} /> {tracker.has(s.id) ? "In my plan" : "Add to plan"}
              </button>
              {s.deadlineMonth && (
                <button className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-surface-2" onClick={() => remind(s.id)}>
                  <CalendarPlus size={15} /> Remind me
                </button>
              )}
              <a href={s.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand">
                Apply / details <ExternalLink size={13} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
