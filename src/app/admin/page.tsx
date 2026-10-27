import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { AdminClient } from "./admin-client";

export const metadata: Metadata = { title: "Admin dashboard", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="Usage statistics, institution editing, checker sales and site jobs." />
      <AdminClient />
    </>
  );
}
