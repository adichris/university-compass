import type { MetadataRoute } from "next";
import { gtecFetched, universities } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";

// Public pages only; personal pages (/plan, /account, /admin) are kept out of search results.
const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/check", priority: 0.95, changeFrequency: "weekly" },
  { path: "/results", priority: 0.9, changeFrequency: "weekly" },
  { path: "/universities", priority: 0.9, changeFrequency: "weekly" },
  { path: "/scholarships", priority: 0.8, changeFrequency: "weekly" },
  { path: "/postgraduate", priority: 0.8, changeFrequency: "monthly" },
  { path: "/career", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contribute", priority: 0.4, changeFrequency: "monthly" },
  { path: "/support", priority: 0.4, changeFrequency: "monthly" },
  { path: "/about", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const dataDate = gtecFetched ? new Date(gtecFetched) : now;
  return [
    ...PAGES.map(({ path, priority, changeFrequency }) => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority })),
    ...universities.map((u) => ({
      url: `${SITE_URL}/universities/${u.slug}`,
      lastModified: dataDate,
      changeFrequency: "monthly" as const,
      priority: u.type === "public" || u.type === "technical" ? 0.7 : 0.6,
    })),
  ];
}
