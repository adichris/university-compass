"use client";

import { useEffect, useMemo, useState } from "react";
import { EyeOff, RotateCcw, Save, Search } from "lucide-react";
import { adminProgrammes, adminUniversities, overridesBuiltAt, TYPE_LABELS } from "@/lib/data";
import { defaultMaxAggregate } from "@/lib/eligibility";
import type { Overrides, UniversityOverride } from "@/lib/overrides";

const EMPTY: Overrides = { updatedAt: null, universities: {}, programmes: {} };
const FIELDS: { key: keyof Omit<UniversityOverride, "hidden">; label: string; long?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "website", label: "Official website" },
  { key: "admissionsUrl", label: "Admissions portal / page" },
  { key: "feesRange", label: "Fees range" },
  { key: "description", label: "Description", long: true },
];

async function saveEdit(kind: "university" | "programme", id: string, patch: unknown): Promise<Overrides | string> {
  const res = await fetch("/api/admin/overrides", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, id, patch }),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? (data.overrides as Overrides) : (data.error ?? "Could not save");
}

export function InstitutionsPanel({ onPending }: { onPending: (pending: boolean) => void }) {
  const [overrides, setOverrides] = useState<Overrides>(EMPTY);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/overrides", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((o: Overrides) => !cancelled && setOverrides(o));
    return () => {
      cancelled = true;
    };
  }, []);

  const pending = Boolean(overrides.updatedAt && overrides.updatedAt !== overridesBuiltAt);
  useEffect(() => onPending(pending), [pending, onPending]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return adminUniversities
      .filter((u) => !needle || `${u.name} ${u.short} ${u.city} ${u.region}`.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [q]);

  const uni = selected ? adminUniversities.find((u) => u.slug === selected) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
      <div className="card h-fit sticky-panel space-y-3 !p-3">
        <label className="relative block">
          <span className="sr-only">Search institutions</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" placeholder={`Search ${adminUniversities.length} institutions`} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <ul className="divide-y divide-border">
          {list.map((u) => {
            const edit = overrides.universities[u.slug];
            const progEdits = adminProgrammes.filter((p) => p.university === u.slug && overrides.programmes[p.id]).length;
            return (
              <li key={u.slug}>
                <button
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2 ${selected === u.slug ? "bg-brand-soft" : ""}`}
                  onClick={() => setSelected(u.slug)}
                >
                  <span className="min-w-0 flex-1 truncate">{edit?.name ?? u.name}</span>
                  {edit?.hidden && <EyeOff size={14} className="shrink-0 text-danger" aria-label="Hidden" />}
                  {(edit || progEdits > 0) && !edit?.hidden && <span className="chip !px-2 !py-0 text-[10px]">edited</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="min-w-0 space-y-4">
        {pending && (
          <p className="rounded-xl bg-accent-soft p-3 text-sm">
            You have saved changes that aren&apos;t live yet. Open the <strong>Jobs</strong> tab and run <strong>Apply changes</strong> to publish them.
          </p>
        )}
        {uni ? (
          <UniversityEditor key={uni.slug} slug={uni.slug} overrides={overrides} onSaved={setOverrides} />
        ) : (
          <div className="card text-muted">Pick an institution to edit its details, cut-offs or visibility.</div>
        )}
      </div>
    </div>
  );
}

function UniversityEditor({ slug, overrides, onSaved }: { slug: string; overrides: Overrides; onSaved: (o: Overrides) => void }) {
  const uni = adminUniversities.find((u) => u.slug === slug)!;
  const current = overrides.universities[slug] ?? {};
  const [form, setForm] = useState<UniversityOverride>(current);
  const [message, setMessage] = useState<string | null>(null);
  const progs = adminProgrammes.filter((p) => p.university === slug);

  const save = async (patch: UniversityOverride | null) => {
    const result = await saveEdit("university", slug, patch);
    if (typeof result === "string") setMessage(result);
    else {
      onSaved(result);
      setForm(patch ?? {});
      setMessage(patch ? "Saved. Run Apply changes to publish." : "Edits removed. Run Apply changes to publish.");
    }
  };

  return (
    <>
      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{uni.name}</h2>
          <p className="text-sm text-muted">{uni.category ?? TYPE_LABELS[uni.type]} · {uni.city}{uni.region !== "Other" ? `, ${uni.region}` : ""} · /universities/{uni.slug}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.long ? "sm:col-span-2" : ""}>
              <label className="label" htmlFor={`f-${f.key}`}>{f.label}</label>
              {f.long ? (
                <textarea id={`f-${f.key}`} className="input min-h-20" placeholder={String(uni[f.key] ?? "")} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : (
                <input id={`f-${f.key}`} className="input" placeholder={String(uni[f.key] ?? "") || "(none)"} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">Empty fields keep the current value (shown greyed out).</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.hidden === true} onChange={(e) => setForm({ ...form, hidden: e.target.checked || undefined })} />
          Hide this institution and its programmes from the site
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={() => save(form)}><Save size={16} /> Save</button>
          {overrides.universities[slug] && (
            <button className="btn-ghost" onClick={() => save(null)}><RotateCcw size={16} /> Remove edits</button>
          )}
          {message && <span className="text-sm text-muted">{message}</span>}
        </div>
      </section>

      <section className="card overflow-x-auto">
        <h3 className="mb-1 font-semibold">Programmes ({progs.length})</h3>
        <p className="mb-3 text-xs text-muted">Enter a cut-off aggregate (6-54) from an official source; it will show as verified. Leave blank to keep the current value.</p>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase text-muted">
            <tr><th className="py-2">Programme</th><th>Current</th><th>New cut-off</th><th>Hide</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {progs.map((p) => (
              <ProgrammeRow key={p.id} id={p.id} name={p.name} base={p.cutoff ?? `≤${defaultMaxAggregate(p)}`} overrides={overrides} onSaved={onSaved} />
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function ProgrammeRow({ id, name, base, overrides, onSaved }: { id: string; name: string; base: number | string; overrides: Overrides; onSaved: (o: Overrides) => void }) {
  const edit = overrides.programmes[id];
  const [cutoff, setCutoff] = useState(edit?.cutoff != null ? String(edit.cutoff) : "");
  const [hidden, setHidden] = useState(edit?.hidden === true);
  const [state, setState] = useState<string | null>(null);
  const dirty = cutoff !== (edit?.cutoff != null ? String(edit.cutoff) : "") || hidden !== (edit?.hidden === true);

  const save = async () => {
    const result = await saveEdit("programme", id, cutoff || hidden ? { cutoff: cutoff || undefined, hidden: hidden || undefined } : null);
    if (typeof result === "string") setState(result);
    else {
      onSaved(result);
      setState("Saved");
    }
  };

  return (
    <tr>
      <td className="py-2 pr-2">{name}</td>
      <td className="font-mono">{base}</td>
      <td><input className="input w-20 !py-1" inputMode="numeric" value={cutoff} placeholder="—" onChange={(e) => setCutoff(e.target.value.replace(/\D/g, ""))} aria-label={`New cut-off for ${name}`} /></td>
      <td><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} aria-label={`Hide ${name}`} /></td>
      <td className="text-right">
        {dirty ? (
          <button className="btn-ghost !px-2 !py-1 text-xs" onClick={save}>Save</button>
        ) : (
          <span className={`text-xs ${state && state !== "Saved" ? "text-danger" : "text-muted"}`}>{state ?? (edit ? "edited" : "")}</span>
        )}
      </td>
    </tr>
  );
}
