import Link from "next/link";
import { ArrowRight, Award, BookOpenCheck, Building2, ClipboardCheck, FileSearch, GraduationCap, HeartHandshake, Sparkles } from "lucide-react";
import { postgradProgrammes, programmes, scholarships, universities, updates } from "@/lib/data";
import { hasContact, hasDonations, SITE } from "@/lib/site";

const FEATURES = [
  { href: "/check", icon: ClipboardCheck, title: "Admission checker", body: "WASSCE, NOVDEC & SSSCE grades → every programme you qualify for, sorted by your chances." },
  { href: "/results", icon: FileSearch, title: "WASSCE result check", body: "Step-by-step result checking, then import your grades from the result slip in one tap." },
  { href: "/postgraduate", icon: GraduationCap, title: "Masters & PhD", body: "Match your degree class, field and experience to postgraduate programmes in Ghana and abroad." },
  { href: "/scholarships", icon: Award, title: "Scholarships", body: "Local and international scholarships matched to your profile, with deadline reminders." },
  { href: "/universities", icon: Building2, title: "Universities", body: "Profiles, programmes, fees ranges, sitting rules and official admission links." },
  { href: "/career", icon: Sparkles, title: "Career quiz", body: "Not sure what to study? Find fields that fit your interests in 2 minutes." },
];

export default function Home() {
  const results = updates.filter((u) => u.kind === "results");
  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl bg-brand px-6 py-14 text-white sm:px-12 dark:bg-brand-soft">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl" aria-hidden />
        <div className="relative max-w-2xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <BookOpenCheck size={14} /> 100% free · No account needed
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Check your university admission chances in Ghana
          </h1>
          <p className="mt-4 text-lg text-white/85 dark:text-foreground/80">
            Enter your WASSCE or NOVDEC grades and instantly see which universities and programmes you qualify for.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/check" className="btn bg-accent px-6 py-3 text-base text-[#1d1600] hover:brightness-95">
              Check my chances <ArrowRight size={18} />
            </Link>
            <Link href="/results" className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10 dark:text-foreground">
              Check WASSCE results
            </Link>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-sm">
            {[
              [universities.length, "institutions"],
              [programmes.length, "programmes"],
              [scholarships.length + postgradProgrammes.length, "PG & scholarships"],
            ].map(([n, l]) => (
              <div key={l}>
                <dt className="text-3xl font-bold">{n}</dt>
                <dd className="text-white/75 dark:text-muted">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Everything you need for admission</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ href, icon: Icon, title, body }) => (
            <Link key={href} href={href} className="card group transition hover:-translate-y-0.5 hover:border-brand">
              <Icon className="mb-3 text-brand" size={26} />
              <h3 className="font-semibold group-hover:text-brand">{title}</h3>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-lg font-semibold">Results & admissions watch</h2>
          <ul className="space-y-3">
            {updates.map((u) => (
              <li key={u.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{u.title}</p>
                  <p className="text-muted">{u.window}</p>
                </div>
                <span className={`chip shrink-0 ${u.status === "released" || u.status === "open" ? "chip-active" : ""}`}>{u.status}</span>
              </li>
            ))}
          </ul>
          {results.length > 0 && (
            <Link href="/results#alerts" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
              Get notified when results are out <ArrowRight size={14} />
            </Link>
          )}
        </div>
        <div className="card">
          <h2 className="mb-3 text-lg font-semibold">How aggregates work</h2>
          <p className="text-sm text-muted">
            Your aggregate adds the grade points (A1 = 1 … C6 = 6) of English, Core Maths, the better of Integrated Science or Social
            Studies, and your best three relevant electives. Lower is better: 6 is perfect, and most degree programmes need 24 or
            better with credits in all six subjects.
          </p>
          <p className="mt-3 text-sm text-muted">
            Each programme can insist on particular electives (e.g. Chemistry and Biology for Medicine), so your aggregate can differ
            from programme to programme. Our checker handles that for you.
          </p>
        </div>
      </section>

      {(hasDonations || hasContact) && (
        <section className="card flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <HeartHandshake className="shrink-0 text-accent" size={32} />
          <div className="flex-1">
            <h2 className="font-semibold">Help keep {SITE.name} free</h2>
            <p className="text-sm text-muted">
              {hasDonations ? "Donate any amount with MTN MoMo to cover hosting and data updates. " : ""}
              {hasContact ? "Need help? Our support line is on Telegram and email." : ""}
            </p>
          </div>
          <Link href="/support" className="btn-primary">
            {hasDonations ? "Donate or get help" : "Get help"} <ArrowRight size={16} />
          </Link>
        </section>
      )}
    </div>
  );
}
