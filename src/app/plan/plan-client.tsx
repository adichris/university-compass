"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth";
import { cleanSittings } from "@/components/grade-editor";
import { ChanceBadge, TRACKER_STATUSES, useSaved, useTracker, type TrackerItem } from "@/components/ui";
import { postgradProgrammes, programmes, scholarships, universityBySlug } from "@/lib/data";
import { checkProgramme, defaultMaxAggregate } from "@/lib/eligibility";
import { downloadText } from "@/lib/ics";
import { KEYS, usePersisted } from "@/lib/store";
import type { Sitting } from "@/lib/types";
import { describeRequirements } from "../check/check-client";

export function PlanClient() {
  const { user } = useAuth();
  const tracker = useTracker();
  const savedP = useSaved(KEYS.savedProgrammes);
  const savedS = useSaved(KEYS.savedScholarships);
  const [sittings] = usePersisted<Sitting[]>(KEYS.sittings, []);
  const [compare, setCompare] = useState<string[]>([]);
  const clean = useMemo(() => cleanSittings(sittings), [sittings]);

  const ug = programmes.filter((p) => savedP.has(p.id));
  const pg = postgradProgrammes.filter((p) => savedP.has(p.id));
  const sch = scholarships.filter((s) => savedS.has(s.id));

  const updateItem = (id: string, patch: Partial<TrackerItem>) => tracker.setItems(tracker.items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) => tracker.setItems(tracker.items.filter((i) => i.id !== id));

  const exportCsv = () => {
    const rows = [["Title", "Institution", "Type", "Status", "Deadline", "Notes"], ...tracker.items.map((i) => [i.title, i.institution, i.kind, i.status, i.deadline ?? "", i.notes ?? ""])];
    downloadText("my-admission-plan.csv", rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
  };

  return (
    <div className="space-y-8">
      {!user && (
        <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
          Your plan is saved on this device. <Link href="/account" className="font-semibold text-brand">Create a free account</Link> (optional) to keep it in sync across your phone and laptop.
        </p>
      )}

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Application tracker</h2>
          {tracker.items.length > 0 && (
            <button className="btn-ghost !py-1.5" onClick={exportCsv}><Download size={15} /> Export CSV</button>
          )}
        </div>
        {tracker.items.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing here yet. Use <strong>Add to plan</strong> on any programme or scholarship in the{" "}
            <Link href="/check" className="text-brand">checker</Link>, <Link href="/postgraduate" className="text-brand">postgraduate</Link> or{" "}
            <Link href="/scholarships" className="text-brand">scholarships</Link> pages.
          </p>
        ) : (
          <div className="space-y-2">
            {tracker.items.map((i) => (
              <div key={i.id} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.title}</p>
                  <p className="text-xs capitalize text-muted">{i.institution} · {i.kind}</p>
                  <input
                    className="mt-1 w-full bg-transparent text-xs text-muted outline-none placeholder:text-muted/60"
                    placeholder="Add a note (e.g. form costs GHS 250, voucher at bank)"
                    value={i.notes ?? ""}
                    onChange={(e) => updateItem(i.id, { notes: e.target.value })}
                    aria-label="Note"
                  />
                </div>
                <select className="input !py-1.5 sm:w-36" value={i.status} onChange={(e) => updateItem(i.id, { status: e.target.value as TrackerItem["status"] })} aria-label="Status">
                  {TRACKER_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <input type="date" className="input !py-1.5 sm:w-40" value={i.deadline ?? ""} onChange={(e) => updateItem(i.id, { deadline: e.target.value })} aria-label="Deadline" />
                <button className="justify-self-end rounded-lg p-2 text-muted hover:text-danger" onClick={() => removeItem(i.id)} aria-label="Remove"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Saved programmes ({ug.length + pg.length})</h2>
          {compare.length >= 2 && <a href="#compare" className="text-sm font-semibold text-brand">Compare {compare.length} →</a>}
        </div>
        {ug.length + pg.length === 0 ? (
          <p className="text-sm text-muted">Tap <strong>Save</strong> on programmes you like to shortlist and compare them.</p>
        ) : (
          <ul className="divide-y divide-border">
            {ug.map((p) => {
              const r = clean.length ? checkProgramme(clean, p, universityBySlug.get(p.university)) : null;
              return (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--brand)]"
                    checked={compare.includes(p.id)}
                    disabled={!compare.includes(p.id) && compare.length >= 3}
                    onChange={(e) => setCompare((c) => (e.target.checked ? [...c, p.id] : c.filter((x) => x !== p.id)))}
                    aria-label={`Compare ${p.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted">{universityBySlug.get(p.university)!.name}</p>
                  </div>
                  {r && <ChanceBadge chance={r.chance} />}
                  <button className="text-muted hover:text-danger" onClick={() => savedP.toggle(p.id)} aria-label="Unsave"><Trash2 size={15} /></button>
                </li>
              );
            })}
            {pg.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <div className="w-4" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted">{p.university ? universityBySlug.get(p.university)?.name : p.universityName} · {p.level.toUpperCase()}</p>
                </div>
                <button className="text-muted hover:text-danger" onClick={() => savedP.toggle(p.id)} aria-label="Unsave"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {compare.length >= 2 && <CompareTable ids={compare} sittings={clean} />}

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Saved scholarships ({sch.length})</h2>
        {sch.length === 0 ? (
          <p className="text-sm text-muted">Save scholarships to keep their deadlines in one place.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sch.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <a href={s.url} target="_blank" rel="noreferrer" className="font-medium hover:text-brand">{s.name}</a>
                  <p className="text-sm text-muted">{s.deadlineWindow}</p>
                </div>
                <button className="text-muted hover:text-danger" onClick={() => savedS.toggle(s.id)} aria-label="Unsave"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CompareTable({ ids, sittings }: { ids: string[]; sittings: Sitting[] }) {
  const items = ids.map((id) => programmes.find((p) => p.id === id)!);
  const rows: [string, (p: (typeof items)[number]) => React.ReactNode][] = [
    ["University", (p) => universityBySlug.get(p.university)!.name],
    ["Location", (p) => `${universityBySlug.get(p.university)!.city}, ${universityBySlug.get(p.university)!.region}`],
    ["Your chance", (p) => (sittings.length ? <ChanceBadge chance={checkProgramme(sittings, p, universityBySlug.get(p.university)).chance} /> : "Enter grades")],
    ["Your aggregate", (p) => (sittings.length ? (checkProgramme(sittings, p, universityBySlug.get(p.university)).aggregate ?? "--") : "--")],
    ["Last cut-off", (p) => p.cutoff ?? `≤${defaultMaxAggregate(p)}`],
    ["Duration", (p) => `${p.years} years`],
    ["Fees (indicative)", (p) => universityBySlug.get(p.university)!.feesRange],
    ["Requirements", (p) => <span className="text-xs">{describeRequirements(p)}</span>],
    ["Careers", (p) => p.careers.join(", ")],
  ];
  return (
    <section id="compare" className="card overflow-x-auto">
      <h2 className="mb-4 text-lg font-semibold">Compare</h2>
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr>
            <th className="w-36" />
            {items.map((p) => <th key={p.id} className="px-3 pb-3 text-left font-semibold">{p.name}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(([label, render]) => (
            <tr key={label}>
              <td className="py-2.5 pr-3 align-top text-muted">{label}</td>
              {items.map((p) => <td key={p.id} className="px-3 py-2.5 align-top">{render(p)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
