import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/ui";
import { ResultsClient } from "./results-client";

export const metadata: Metadata = pageMetadata({
  path: "/results",
  title: "WASSCE & NOVDEC result checker - check results and buy a checker",
  description:
    "Check your WASSCE or NOVDEC results on the official WAEC portal step by step, buy a genuine results checker by MoMo, and import your grades to see where you can study.",
});

export default function ResultsPage() {
  return (
    <>
      <PageHeader
        title="WASSCE & NOVDEC results"
        subtitle="Check your results on the official WAEC portal with your details ready to copy, then bring your grades back here in one step to see where you can study."
      />
      <ResultsClient />
    </>
  );
}
