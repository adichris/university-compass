// alwaysdata start command: `node /home/<account>/university-compass/scripts/start-alwaysdata.mjs`
// alwaysdata passes the address to listen on as IP (or HOST) and the port as PORT;
// the Next.js standalone server expects HOSTNAME and PORT.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

process.env.HOSTNAME = process.env.IP || process.env.HOST || process.env.HOSTNAME || "0.0.0.0";
process.env.NODE_ENV = "production";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
// The standalone server changes its working directory, so tell the app where the project lives
// (the admin dashboard reads and writes data/local/ there).
process.env.CC_PROJECT_ROOT = root;

// Dashboard jobs stop this PID after a successful build; alwaysdata then starts the new build.
try {
  mkdirSync(join(root, "data", "local"), { recursive: true });
  writeFileSync(join(root, "data", "local", "server.pid"), String(process.pid));
} catch {}

createRequire(import.meta.url)(join(root, ".next", "standalone", "server.js"));

// Institution pages are rendered on their first visit and then cached. After each start, visit them once
// in the background (one at a time, so the small server stays responsive) so real visitors and search
// engines get cached pages straight away. WARM_CACHE=0 turns this off.
if (process.env.WARM_CACHE !== "0") setTimeout(warmCache, 5000);

async function warmCache() {
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    const paths = [...sitemap.matchAll(/<loc>[^<]*?(\/universities\/[^<]+)<\/loc>/g)].map((m) => m[1]);
    const started = Date.now();
    let warmed = 0;
    for (const path of paths) {
      const res = await fetch(base + path).catch(() => null);
      await res?.arrayBuffer().catch(() => {});
      if (res?.ok) warmed++;
      await pause(250);
    }
    console.log(`Cache warm-up: ${warmed}/${paths.length} institution pages in ${Math.round((Date.now() - started) / 1000)}s`);
  } catch (err) {
    console.warn("Cache warm-up skipped:", err instanceof Error ? err.message : err);
  }
}
