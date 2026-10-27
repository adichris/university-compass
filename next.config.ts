import type { NextConfig } from "next";

// Memory settings for small hosts (alwaysdata). See node_modules/next/dist/docs/01-app/02-guides/memory-usage.md.
const buildCpus = process.env.NEXT_BUILD_CPUS ? Number(process.env.NEXT_BUILD_CPUS) : undefined;

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Release builds go to a separate folder and are swapped in only if they succeed (scripts/build-release.sh).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Self-contained server bundle in .next/standalone for hosts like alwaysdata (see docs/deploy-alwaysdata.md).
  output: "standalone",
  partialPrefetching: true,
  // Source maps during "Generating static pages" only improve build error stack traces, and cost memory.
  enablePrerenderSourceMaps: false,
  experimental: {
    serverSourceMaps: false,
    // Load each page's code on first request instead of all at start-up: a smaller running server, which
    // matters when a rebuild runs next to the live site.
    preloadEntriesOnStart: false,
    // Small hosts kill the build if every CPU gets its own page-generation worker; NEXT_BUILD_CPUS=1 trades
    // build speed for memory and also renders fewer pages at once. Unset = Next.js defaults.
    ...(buildCpus ? { cpus: buildCpus, staticGenerationMaxConcurrency: 2 } : {}),
  },
  // The "Running TypeScript" step can exceed shared-hosting memory, so server builds skip it
  // (NEXT_SKIP_TYPECHECK=1). Type checks run on GitHub for every push instead (.github/workflows/ci.yml).
  ...(process.env.NEXT_SKIP_TYPECHECK === "1" ? { typescript: { ignoreBuildErrors: true } } : {}),
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
