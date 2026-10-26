// Copies static assets into the standalone build so its server.js can serve them.
// Run after `next build` (npm run build:standalone does both). Honours NEXT_DIST_DIR (default .next).
import { cpSync, existsSync } from "node:fs";

const dist = process.env.NEXT_DIST_DIR || ".next";
const out = `${dist}/standalone`;
if (!existsSync(`${out}/server.js`)) {
  console.error(`No ${out}/server.js - run "next build" with output: "standalone" first.`);
  process.exit(1);
}
cpSync("public", `${out}/public`, { recursive: true });
cpSync(`${dist}/static`, `${out}/${dist}/static`, { recursive: true });
console.log(`Standalone bundle ready in ${out}`);
