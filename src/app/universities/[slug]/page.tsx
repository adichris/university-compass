import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MapPin } from "lucide-react";
import { FIELD_LABELS, programmes, TYPE_LABELS, universities, universityBySlug } from "@/lib/data";
import { defaultMaxAggregate } from "@/lib/eligibility";
import type { Field } from "@/lib/types";

export function generateStaticParams() {
  return universities.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: PageProps<"/universities/[slug]">): Promise<Metadata> {
  const u = universityBySlug.get((await params).slug);
  return u ? { title: `${u.name} (${u.short}) - programmes & cut-offs`, description: u.description } : {};
}

export default async function UniversityPage({ params }: PageProps<"/universities/[slug]">) {
  const u = universityBySlug.get((await params).slug);
  if (!u) notFound();
  const list = programmes.filter((p) => p.university === u.slug);
  const byField = Object.entries(
    list.reduce<Record<string, typeof list>>((acc, p) => ((acc[p.field] ??= []).push(p), acc), {}),
  );

  return (
    <div className="space-y-8">
      <div>
        <Link href="/universities" className="text-sm text-muted hover:text-brand">← All universities & colleges</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="rounded-lg bg-brand-soft px-2.5 py-1 text-sm font-bold text-brand">{u.short}</span>
          <span className="chip">{u.category ?? TYPE_LABELS[u.type]}</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{u.name}</h1>
        <p className="mt-2 flex items-center gap-1 text-muted">
          <MapPin size={16} className="shrink-0" /> {u.address ?? [u.city, u.region !== "Other" ? `${u.region} Region` : ""].filter(Boolean).join(", ")}
        </p>
        <p className="mt-4 max-w-3xl">{u.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-muted">Indicative fees</p>
          <p className="mt-1 font-semibold">{u.feesRange}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Combining results</p>
          <p className="mt-1 font-semibold">
            {u.sittingsKnown === false
              ? "Ask the institution whether it accepts combined results"
              : u.multipleSittings ? `Up to ${u.maxSittings} sittings (e.g. WASSCE + NOVDEC)` : "Single sitting preferred"}
          </p>
        </div>
        <div className="card flex flex-col gap-2">
          {u.website ? (
            <>
              <a href={u.admissionsUrl} target="_blank" rel="noreferrer" className="btn-primary">
                Admissions portal <ExternalLink size={15} />
              </a>
              <a href={u.website} target="_blank" rel="noreferrer" className="btn-ghost">
                Official website <ExternalLink size={15} />
              </a>
            </>
          ) : (
            <p className="text-sm text-muted">We don&apos;t have this institution&apos;s website yet. Its accredited programmes are listed on GTEC.</p>
          )}
          {u.gtecUrl && (
            <a href={u.gtecUrl} target="_blank" rel="noreferrer" className="btn-ghost">
              GTEC accreditation <ExternalLink size={15} />
            </a>
          )}
        </div>
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold">Programmes ({list.length})</h2>
          <Link href="/check" className="text-sm font-semibold text-brand">Check which ones you qualify for →</Link>
        </div>
        <div className="space-y-6">
          {byField.map(([field, items]) => (
            <div key={field}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{FIELD_LABELS[field as Field]}</h3>
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-left text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Programme</th>
                      <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Duration</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Cut-off / max*</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {items.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{p.name}</p>
                          {p.note && <p className="text-xs text-muted">{p.note}</p>}
                          {!p.requirementsKnown && <p className="text-xs text-muted">Subject requirements not yet mapped - general entry rules apply</p>}
                        </td>
                        <td className="hidden px-4 py-3 text-muted sm:table-cell">{p.requirementsKnown ? `${p.years} yrs · ` : ""}{p.level.toUpperCase()}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">{p.cutoff ?? `≤${defaultMaxAggregate(p)}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          *Cut-offs are indicative aggregates for regular, fee-free admission and change every year. Fee-paying, weekend and
          distance options often accept higher aggregates. Where no cut-off is known we show the maximum aggregate
          allowed (≤). Programme lists come from GTEC&apos;s accreditation register. Confirm on the official portal.
        </p>
      </section>
    </div>
  );
}
