import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ResultsClient } from "./results-client";

export const metadata: Metadata = {
  title: "WASSCE result checker",
  description: "Check your WASSCE or NOVDEC results on the official WAEC portal step by step, then import your grades automatically to see your university options.",
};

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
