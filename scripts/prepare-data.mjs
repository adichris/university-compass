// Creates the git-ignored data/local/ files the app imports, if they don't exist yet.
// data/local holds admin edits (overrides.json) and GTEC data refreshed from the admin dashboard
// (generated/*.json). Empty files mean "use the committed data".
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const files = {
  "data/local/overrides.json": { updatedAt: null, universities: {}, programmes: {} },
  "data/local/generated/institutions.json": { source: "", fetched: "", institutions: [], links: {} },
  "data/local/generated/programmes.json": { source: "", fetched: "", programmes: [] },
  "data/local/generated/postgrad.json": { source: "", fetched: "", programmes: [] },
};

mkdirSync("data/local/generated", { recursive: true });
mkdirSync("data/local/jobs", { recursive: true });
for (const [path, value] of Object.entries(files)) {
  if (!existsSync(path)) writeFileSync(path, JSON.stringify(value, null, 1) + "\n");
}
