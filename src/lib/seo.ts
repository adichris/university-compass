import type { Metadata } from "next";
import { SITE, SITE_TITLE, SUPPORT } from "./site";

/** Public address of the site, used for canonical links, the sitemap and share previews. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** The default share image (app/opengraph-image.tsx). A page's own openGraph replaces the inherited one, so pages restate it. */
export const SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_TITLE} - ${SITE.tagline}` };

/**
 * Metadata for a public page: title, description, its canonical URL, and Open Graph / Twitter
 * share previews.
 */
export function pageMetadata({ path, title, description }: { path: string; title: string; description: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: SITE_TITLE, locale: "en_GH", type: "website", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE.url] },
  };
}

/** Site-wide structured data: the organisation behind the site and the site itself. */
export function siteJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_TITLE,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      ...(SUPPORT.email ? { email: SUPPORT.email } : {}),
      ...(SUPPORT.telegram ? { sameAs: [`https://t.me/${SUPPORT.telegram.replace(/^@/, "")}`] } : {}),
      areaServed: { "@type": "Country", name: "Ghana" },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_TITLE,
      alternateName: SITE.name,
      url: SITE_URL,
      description: SITE.tagline,
      inLanguage: "en-GH",
    },
  ];
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${SITE_URL}${item.path}` })),
  };
}
