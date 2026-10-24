// Copies static assets into the standalone build so `.next/standalone/server.js` can serve them.
// Run after `next build` (npm run build:standalone does both).
import { cpSync, existsSync } from "node:fs";

const out = ".next/standalone";
if (!existsSync(`${out}/server.js`)) {
  console.error(`No ${out}/server.js - run "next build" with output: "standalone" first.`);
  process.exit(1);
}
cpSync("public", `${out}/public`, { recursive: true });
cpSync(".next/static", `${out}/.next/static`, { recursive: true });
console.log(`Standalone bundle ready in ${out}`);
