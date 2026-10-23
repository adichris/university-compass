import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { CheckClient } from "./check-client";

export const metadata: Metadata = {
  title: "Admission checker",
  description: "Enter your WASSCE, NOVDEC or SSSCE grades and see which Ghanaian university programmes you qualify for.",
};

export default function CheckPage() {
  return (
    <>
      <PageHeader
        title="University admission checker"
        subtitle="Enter your grades once. We check every programme's subject requirements and compare your aggregate with recent cut-off points."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface-2" />}>
        <CheckClient />
      </Suspense>
    </>
  );
}
