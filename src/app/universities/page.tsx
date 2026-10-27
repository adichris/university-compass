import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/ui";
import { gtecFetched } from "@/lib/data";
import { UniversitiesClient } from "./universities-client";

export const metadata: Metadata = pageMetadata({
  path: "/universities",
  title: "All accredited universities & colleges in Ghana",
  description:
    "Every GTEC-accredited university, technical university, college of education and nursing college in Ghana, with accredited programmes, cut-offs and admission links.",
});

export default function UniversitiesPage() {
  return (
    <>
      <PageHeader
        title="Universities & colleges"
        subtitle={`Accredited institutions from the Ghana Tertiary Education Commission (GTEC) register${gtecFetched ? `, checked ${gtecFetched}` : ""}, with their accredited programmes and admission links.`}
      />
      <UniversitiesClient />
    </>
  );
}
