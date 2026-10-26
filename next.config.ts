import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Self-contained server bundle in .next/standalone for hosts like alwaysdata (see docs/deploy-alwaysdata.md).
  output: "standalone",
  partialPrefetching: true,
  // Database drivers stay out of the server bundle (libsql ships native bindings).
  serverExternalPackages: ["@libsql/client", "libsql", "pg"],
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
