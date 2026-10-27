import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { scholarships } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { ScholarshipsClient } from "./scholarships-client";

export const metadata: Metadata = pageMetadata({
  path: "/scholarships",
  title: "Scholarships for Ghanaian students - undergraduate, masters & PhD",
  description:
    "Local and international scholarships for Ghanaian students - GETFund, Mastercard Foundation, Chevening, Commonwealth, DAAD and more - matched to your level, field and destination, with deadlines.",
});

export default function ScholarshipsPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Scholarships for Ghanaian students",
          itemListElement: scholarships.map((sch, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": sch.kind === "loan" ? "LoanOrCredit" : "MonetaryGrant",
              name: sch.name,
              description: `${sch.eligibility} Covers: ${sch.coverage}`,
              url: sch.url,
              funder: { "@type": "Organization", name: sch.provider },
            },
          })),
        }}
      />
      <PageHeader
        title="Scholarships"
        subtitle="Local and international funding for Ghanaian students, from SHS leavers to PhD applicants. Fill in what applies to you to rank the best matches."
      />
      <ScholarshipsClient />
    </>
  );
}
