import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ContactCard, DonateCard } from "@/components/support";
import { PageHeader } from "@/components/ui";
import { hasContact, hasDonations, SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/support",
  title: "Help & support - donate with MTN MoMo",
  description:
    "Get help using UniversityCompass.gh on Telegram or email, or support the free service with an MTN MoMo donation.",
});

export default function SupportPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Support & donate" subtitle={`Get help from our support line, or help keep ${SITE.name} free for every student.`} />
      <div className="space-y-6">
        <ContactCard />
        <DonateCard />
        {!hasContact && !hasDonations && (
          <div className="card text-muted">Support and donation details will be added here soon.</div>
        )}
      </div>
    </div>
  );
}
