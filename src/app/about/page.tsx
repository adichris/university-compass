import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { SITE_TITLE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/about",
  title: "About CampusCompass.gh - how we calculate your chances",
  description:
    "How CampusCompass.gh calculates WASSCE aggregates and admission chances, where the university data comes from, and how we protect your privacy.",
});

export default function AboutPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title={`About ${SITE_TITLE}`} subtitle="A free admission guide for Ghanaian students. No paywalls, and no account required." />
      <div className="space-y-6 leading-relaxed">
        <section className="card space-y-2">
          <h2 className="text-lg font-semibold">How we calculate your chances</h2>
          <p className="text-muted">
            For each programme we check the core-subject rule (Integrated Science or Social Studies), the required electives, any
            minimum grades, and the maximum aggregate. We then pick the best combination of your electives that satisfies the
            programme and compare that aggregate with the most recent cut-off:
          </p>
          <ul className="list-disc pl-5 text-muted">
            <li><strong>Safe</strong>: 2 or more points better than the cut-off</li>
            <li><strong>Competitive</strong>: at or 1 point inside the cut-off</li>
            <li><strong>Reach</strong>: up to 2 points outside</li>
            <li><strong>Unlikely</strong>: more than 2 points outside</li>
          </ul>
          <p className="text-muted">If you have more than one sitting (e.g. WASSCE + NOVDEC), we combine your best grades only where that university accepts it.</p>
        </section>
        <section className="card space-y-2">
          <h2 className="text-lg font-semibold">Where the data comes from</h2>
          <p className="text-muted">
            Requirements and cut-offs are collected from university admission brochures, official websites and published cut-off
            lists by an automated collector, then reviewed by a person before going live. Students can also{" "}
            <Link href="/contribute" className="text-brand">report their outcomes</Link> anonymously.
          </p>
          <p className="text-muted">
            Cut-off points change every year and depend on how many people apply. Treat our figures as guidance and confirm with
            the university. Entries marked &quot;estimate&quot; have not yet been verified against an official source.
          </p>
        </section>
        <section className="card space-y-2">
          <h2 className="text-lg font-semibold">WASSCE results</h2>
          <p className="text-muted">
            Results come only from WAEC. We do not access the WAEC portal for you or store your checker PIN. We help you enter your
            details correctly, open the official portal, and read your grades back in so you don&apos;t have to type them twice.
          </p>
        </section>
        <section className="card space-y-2">
          <h2 className="text-lg font-semibold">Privacy</h2>
          <p className="text-muted">
            Without an account, everything stays in your browser. With an optional account, your saved data is stored securely so it
            syncs across devices. Outcome reports are anonymous. We comply with Ghana&apos;s Data Protection Act, 2012 (Act 843).
          </p>
          <p className="text-muted">
            We keep simple, anonymous usage statistics (pages visited, how many checks are run, which buttons are used) to
            improve the site. They use no cookies and store no names, grades, index numbers or IP addresses; visitors are
            counted with a code that changes every day. If your browser sends &quot;Do Not Track&quot;, nothing is recorded.
          </p>
        </section>
      </div>
    </div>
  );
}
