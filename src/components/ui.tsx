"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { KEYS, usePersisted } from "@/lib/store";
import type { Chance } from "@/lib/types";

export const CHANCE_META: Record<Chance, { label: string; hint: string }> = {
  safe: { label: "Safe", hint: "Your aggregate is comfortably better than the last cut-off" },
  competitive: { label: "Competitive", hint: "At or just inside the last cut-off - a good chance" },
  reach: { label: "Reach", hint: "Slightly outside the last cut-off - possible if the cut-off moves" },
  unlikely: { label: "Unlikely", hint: "Well outside the last cut-off" },
  ineligible: { label: "Not eligible", hint: "A subject or grade requirement isn't met" },
};

export function ChanceBadge({ chance }: { chance: Chance }) {
  return (
    <span
      title={CHANCE_META[chance].hint}
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: `var(--${chance})`, background: `var(--${chance}-bg)` }}
    >
      {CHANCE_META[chance].label}
    </span>
  );
}

export function useSaved(key: typeof KEYS.savedProgrammes | typeof KEYS.savedScholarships) {
  const [saved, setSaved] = usePersisted<string[]>(key, []);
  const toggle = (id: string) => setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  return { saved, toggle, has: (id: string) => saved.includes(id) };
}

export function SaveButton({ active, onClick, label = "Save" }: { active: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
        active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {active ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
      {active ? "Saved" : label}
    </button>
  );
}

export interface OutcomeStats {
  n: number;
  admitted: number;
  bestAdmitted: number | null;
  worstAdmitted: number | null;
}

/** Crowdsourced outcomes - fetched once, failures are silent (feature is a bonus). */
export function useOutcomeStats() {
  const [stats, setStats] = useState<Record<string, OutcomeStats>>({});
  useEffect(() => {
    fetch("/api/outcomes")
      .then((r) => (r.ok ? r.json() : { stats: {} }))
      .then((d) => setStats(d.stats ?? {}))
      .catch(() => {});
  }, []);
  return stats;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export interface TrackerItem {
  id: string;
  title: string;
  institution: string;
  kind: "programme" | "scholarship" | "postgrad";
  refId?: string;
  status: "considering" | "form-bought" | "applied" | "admitted" | "not-admitted";
  deadline?: string;
  notes?: string;
}

export const TRACKER_STATUSES: { id: TrackerItem["status"]; label: string }[] = [
  { id: "considering", label: "Considering" },
  { id: "form-bought", label: "Form bought" },
  { id: "applied", label: "Applied" },
  { id: "admitted", label: "Admitted" },
  { id: "not-admitted", label: "Not admitted" },
];

export function useTracker() {
  const [items, setItems] = usePersisted<TrackerItem[]>(KEYS.tracker, []);
  const add = (item: Omit<TrackerItem, "id" | "status"> & { status?: TrackerItem["status"] }) =>
    setItems((prev) =>
      item.refId && prev.some((p) => p.refId === item.refId)
        ? prev
        : [...prev, { status: "considering", ...item, id: Math.random().toString(36).slice(2, 10) }],
    );
  const has = (refId: string) => items.some((i) => i.refId === refId);
  return { items, setItems, add, has };
}
