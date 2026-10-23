import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ContributeClient } from "./contribute-client";

export const metadata: Metadata = { title: "Share your admission outcome" };

export default function ContributePage() {
  return (
    <>
      <PageHeader
        title="Share your admission outcome"
        subtitle="Got your admission letter (or not)? Tell us your aggregate anonymously. Real outcomes from students make everyone's predictions more accurate."
      />
      <ContributeClient />
    </>
  );
}
