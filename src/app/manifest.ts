import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UniChecker.gh",
    short_name: "UniChecker",
    description: "Check your university admission chances in Ghana - free.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#0b6b3f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
