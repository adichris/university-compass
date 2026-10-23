import type { MetadataRoute } from "next";
import { universities } from "@/lib/data";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/check", "/results", "/postgraduate", "/scholarships", "/universities", "/career", "/contribute", "/about"];
  return [
    ...pages.map((p) => ({ url: `${BASE}${p}` })),
    ...universities.map((u) => ({ url: `${BASE}/universities/${u.slug}` })),
  ];
}
