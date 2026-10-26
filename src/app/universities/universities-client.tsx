"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { programmes, REGIONS, TYPE_LABELS, TYPE_ORDER, universities } from "@/lib/data";
import type { InstitutionType } from "@/lib/types";

const counts = programmes.reduce<Record<string, number>>((acc, p) => ((acc[p.university] = (acc[p.university] ?? 0) + 1), acc), {});

export function UniversitiesClient() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<InstitutionType | "all">("all");
  const [region, setRegion] = useState("all");

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = universities.filter(
      (u) =>
        (type === "all" || u.type === type) &&
        (region === "all" || u.region === region) &&
        (!needle || `${u.name} ${u.short} ${u.city} ${u.region}`.toLowerCase().includes(needle)),
    );
    return TYPE_ORDER.map((t) => ({ type: t, list: list.filter((u) => u.type === t).sort((a, b) => a.name.localeCompare(b.name)) })).filter(
      (g) => g.list.length,
    );
  }, [q, type, region]);
  const total = groups.reduce((n, g) => n + g.list.length, 0);

  return (
    <div className="space-y-8">
      <div className="card grid gap-2 !p-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <span className="sr-only">Search institutions</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className={`input !pl-9 ${q ? "input-active" : ""}`} placeholder="Search by name, town or region" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className={`input ${type !== "all" ? "input-active" : ""}`} aria-label="Institution type" value={type} onChange={(e) => setType(e.target.value as InstitutionType | "all")}>
          <option value="all">All types</option>
          {TYPE_ORDER.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select className={`input ${region !== "all" ? "input-active" : ""}`} aria-label="Region" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="all">All regions</option>
          {REGIONS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <p className="text-sm text-muted">{total} institution{total === 1 ? "" : "s"}</p>

      {groups.map(({ type: t, list }) => (
        <section key={t}>
          <h2 className="mb-4 text-xl font-semibold">
            {TYPE_LABELS[t]} <span className="text-base font-normal text-muted">({list.length})</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((u) => (
              <Link key={u.slug} href={`/universities/${u.slug}`} className="card group flex flex-col transition hover:border-brand">
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-lg bg-brand-soft px-2 py-1 text-xs font-bold text-brand">{u.short}</span>
                  <span className="text-xs text-muted">{counts[u.slug] ?? 0} programmes</span>
                </div>
                <h3 className="mt-3 font-semibold group-hover:text-brand">{u.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                  <MapPin size={14} className="shrink-0" /> {[u.city, u.region !== "Other" ? u.region : ""].filter(Boolean).join(", ")}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{u.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {total === 0 && <div className="card text-muted">No institutions match. Try a different name or clear the filters.</div>}
    </div>
  );
}
