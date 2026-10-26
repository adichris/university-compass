import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { gtecFetched } from "@/lib/data";
import { UniversitiesClient } from "./universities-client";

export const metadata: Metadata = {
  title: "Universities & colleges in Ghana",
  description: "Every accredited university, technical university, college of education and nursing college in Ghana, with programmes and admission links.",
};

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
