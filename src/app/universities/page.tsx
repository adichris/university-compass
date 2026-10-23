import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { programmes, universities } from "@/lib/data";

export const metadata: Metadata = {
  title: "Universities in Ghana",
  description: "Accredited public, private and technical universities in Ghana with programmes, cut-offs and admission links.",
};

const TYPE_LABEL = { public: "Public university", private: "Private university", technical: "Technical university" } as const;

export default function UniversitiesPage() {
  const groups = (["public", "technical", "private"] as const).map((t) => ({ type: t, list: universities.filter((u) => u.type === t) }));
  return (
    <>
      <PageHeader
        title="Universities"
        subtitle="Accredited institutions with their programmes, indicative cut-offs, fees ranges and official admission portals. Always confirm accreditation status with GTEC."
      />
      <div className="space-y-10">
        {groups.map(({ type, list }) => (
          <section key={type}>
            <h2 className="mb-4 text-xl font-semibold">{TYPE_LABEL[type]}s</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((u) => {
                const count = programmes.filter((p) => p.university === u.slug).length;
                return (
                  <Link key={u.slug} href={`/universities/${u.slug}`} className="card group flex flex-col transition hover:border-brand">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-lg bg-brand-soft px-2 py-1 text-xs font-bold text-brand">{u.short}</span>
                      <span className="text-xs text-muted">{count} programmes</span>
                    </div>
                    <h3 className="mt-3 font-semibold group-hover:text-brand">{u.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                      <MapPin size={14} /> {u.city}, {u.region}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted">{u.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
