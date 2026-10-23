import type { MetadataRoute } from "next";
import { SITE, SITE_TITLE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE.name,
    description: "Check your university admission chances in Ghana - free.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6fb",
    theme_color: "#3f3dbc",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
