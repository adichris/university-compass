import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/ui";
import { CareerClient } from "./career-client";

export const metadata: Metadata = pageMetadata({
  path: "/career",
  title: "What should I study? Free career & course quiz",
  description:
    "Not sure what to study after SHS? Answer 5 quick questions to find fields that suit you, then see the Ghanaian university programmes your grades qualify for.",
});

export default function CareerPage() {
  return (
    <>
      <PageHeader title="What should I study?" subtitle="Five quick questions to point you towards fields that match your interests. Then check which programmes your grades qualify for." />
      <CareerClient />
    </>
  );
}
