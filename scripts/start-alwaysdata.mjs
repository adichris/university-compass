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
