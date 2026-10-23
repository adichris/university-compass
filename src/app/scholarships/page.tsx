import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ScholarshipsClient } from "./scholarships-client";

export const metadata: Metadata = {
  title: "Scholarships for Ghanaian students",
  description: "Undergraduate, master's and PhD scholarships for Ghanaians - local and international - matched to your profile.",
};

export default function ScholarshipsPage() {
  return (
    <>
      <PageHeader
        title="Scholarships"
        subtitle="Local and international funding for Ghanaian students, from SHS leavers to PhD applicants. Fill in what applies to you to rank the best matches."
      />
      <ScholarshipsClient />
    </>
  );
}
