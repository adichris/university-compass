import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth";
import { SiteHeader } from "@/components/site-header";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "UniChecker.gh - Check your university admission chances in Ghana",
    template: "%s · UniChecker.gh",
  },
  description:
    "Free tool: enter your WASSCE, NOVDEC or SSSCE grades and instantly see which Ghanaian universities and programmes you qualify for. Masters, PhD and scholarships too.",
  applicationName: "UniChecker.gh",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b6b3f" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1411" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-border py-8 text-sm text-muted">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Free for every student. Cut-off points are indicative - always confirm with the university before applying.
              </p>
              <div className="flex gap-4">
                <Link href="/about" className="hover:text-foreground">About & data</Link>
                <Link href="/contribute" className="hover:text-foreground">Share your outcome</Link>
                <Link href="/career" className="hover:text-foreground">Career quiz</Link>
              </div>
            </div>
          </footer>
        </AuthProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
