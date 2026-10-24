import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Self-contained server bundle in .next/standalone for hosts like alwaysdata (see docs/deploy-alwaysdata.md).
  output: "standalone",
  partialPrefetching: true,
  // libsql ships native bindings; keep it out of the server bundle.
  serverExternalPackages: ["@libsql/client", "libsql"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
