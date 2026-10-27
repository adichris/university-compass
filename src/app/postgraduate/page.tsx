import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/ui";
import { PostgradClient } from "./postgrad-client";

export const metadata: Metadata = pageMetadata({
  path: "/postgraduate",
  title: "Masters, MPhil & PhD programmes in Ghana - eligibility checker",
  description:
    "Check which master’s, MPhil and PhD programmes in Ghana and abroad match your degree class, CGPA, field and work experience, with matching scholarships.",
});

export default function PostgraduatePage() {
  return (
    <>
      <PageHeader
        title="Masters, MPhil & PhD"
        subtitle="Tell us about your degree and experience. We match you to postgraduate programmes in Ghana and abroad, and to the funding that fits."
      />
      <PostgradClient />
    </>
  );
}
