import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { AccountClient } from "./account-client";

export const metadata: Metadata = { title: "Account (optional)" };

export default function AccountPage() {
  return (
    <>
      <PageHeader title="Your account" subtitle="Optional. Sign in only if you want your saved data on more than one device." />
      <AccountClient />
    </>
  );
}
