import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { CheckClient } from "./check-client";

export const metadata: Metadata = pageMetadata({
  path: "/check",
  title: "WASSCE admission checker - see which universities you qualify for",
  description:
    "Free WASSCE, NOVDEC and SSSCE aggregate calculator. Enter your grades to see every Ghanaian university, technical university and college programme you qualify for, with cut-offs and recommendations.",
});

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
