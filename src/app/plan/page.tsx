import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { PlanClient } from "./plan-client";

export const metadata: Metadata = { title: "My admission plan" };

export default function PlanPage() {
  return (
    <>
      <PageHeader title="My admission plan" subtitle="Track applications, compare shortlisted programmes and keep scholarship deadlines in one place." />
      <PlanClient />
    </>
  );
}
