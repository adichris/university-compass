// alwaysdata start command: `node /home/<account>/campuscompass/scripts/start-alwaysdata.mjs`
// alwaysdata passes the address to listen on as IP (or HOST) and the port as PORT;
// the Next.js standalone server expects HOSTNAME and PORT.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

process.env.HOSTNAME = process.env.IP || process.env.HOST || process.env.HOSTNAME || "0.0.0.0";
process.env.NODE_ENV = "production";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
createRequire(import.meta.url)(join(root, ".next", "standalone", "server.js"));
