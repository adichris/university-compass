import "server-only";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Overrides } from "./overrides";

/** Project root (the standalone server changes directory, so the start script passes it in). */
export const PROJECT_ROOT = process.env.CC_PROJECT_ROOT ?? process.cwd();
export const LOCAL_DIR = join(PROJECT_ROOT, "data", "local");
export const JOBS_DIR = join(LOCAL_DIR, "jobs");
const OVERRIDES = join(LOCAL_DIR, "overrides.json");

export function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

/** Write via a temp file + rename so a crash never leaves half a JSON file behind. */
export function writeJson(path: string, value: unknown) {
  mkdirSync(join(path, ".."), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 1) + "\n");
  renameSync(tmp, path);
}

export function readOverrides(): Overrides {
  return readJson<Overrides>(OVERRIDES, { updatedAt: null, universities: {}, programmes: {} });
}

export function writeOverrides(o: Overrides) {
  writeJson(OVERRIDES, { ...o, updatedAt: new Date().toISOString() });
}

export function readText(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf-8") : "";
}
