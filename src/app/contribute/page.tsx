import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/ui";
import { ContributeClient } from "./contribute-client";

export const metadata: Metadata = pageMetadata({
  path: "/contribute",
  title: "Share your university admission outcome",
  description:
    "Tell other Ghanaian students the aggregate you were admitted with, anonymously, so everyone gets more accurate cut-offs.",
});

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
