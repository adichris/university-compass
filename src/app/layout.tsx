import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth";
import { SiteHeader } from "@/components/site-header";
import { ServiceWorker } from "@/components/service-worker";
import { HelpButton } from "@/components/support";
import { PageView } from "@/components/pageview";
import "./globals.css";
import { SITE, SITE_TITLE } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL, siteJsonLd } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_TITLE} - ${SITE.tagline}`,
    template: `%s · ${SITE_TITLE}`,
  },
  description:
    "Free tool: enter your WASSCE, NOVDEC or SSSCE grades and instantly see which Ghanaian universities and programmes you qualify for. Masters, PhD and scholarships too.",
  applicationName: SITE_TITLE,
  keywords: [
    "WASSCE aggregate calculator", "university admission Ghana", "cut-off points", "NOVDEC", "WASSCE results checker",
    "BECE results checker", "KNUST", "University of Ghana", "UCC", "nursing training colleges", "colleges of education",
    "scholarships Ghana", "masters in Ghana",
  ],
  openGraph: { siteName: SITE_TITLE, locale: "en_GH", type: "website" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3f3dbc" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f1c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GH" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-border py-8 text-sm text-muted">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Free for every student. Cut-off points are indicative - always confirm with the university before applying.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <Link href="/about" className="hover:text-foreground">About & data</Link>
                <Link href="/contribute" className="hover:text-foreground">Share your outcome</Link>
                <Link href="/career" className="hover:text-foreground">Career quiz</Link>
                <Link href="/support" className="hover:text-foreground">Support & donate</Link>
              </div>
            </div>
          </footer>
        </AuthProvider>
        <JsonLd data={siteJsonLd()} />
        <PageView />
        <HelpButton />
        <ServiceWorker />
      </body>
    </html>
  );
}
