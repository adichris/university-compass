import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Release builds go to a separate folder and are swapped in only if they succeed (scripts/build-release.sh).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Self-contained server bundle in .next/standalone for hosts like alwaysdata (see docs/deploy-alwaysdata.md).
  output: "standalone",
  partialPrefetching: true,
  // Small hosts (alwaysdata) kill the build if every CPU gets its own page-generation worker;
  // NEXT_BUILD_CPUS=1 trades build speed for memory. Unset = Next.js picks.
  ...(process.env.NEXT_BUILD_CPUS ? { experimental: { cpus: Number(process.env.NEXT_BUILD_CPUS) } } : {}),
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
