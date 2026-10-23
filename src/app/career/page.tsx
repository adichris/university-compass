import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { CareerClient } from "./career-client";

export const metadata: Metadata = { title: "Career & course quiz", description: "Not sure what to study? Answer 5 quick questions to find fields that suit you." };

export default function CareerPage() {
  return (
    <>
      <PageHeader title="What should I study?" subtitle="Five quick questions to point you towards fields that match your interests. Then check which programmes your grades qualify for." />
      <CareerClient />
    </>
  );
}
