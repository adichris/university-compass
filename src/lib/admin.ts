import "server-only";
import { createHmac, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { join } from "node:path";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { LOCAL_DIR, readJson } from "./admin-files";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/**
 * Admin access for the dashboard. The password is set on the server with
 * `node scripts/admin-password.mjs`, which stores only a scrypt hash in data/local/admin.json.
 * The file is read on every request, so a new password applies immediately; without it the
 * dashboard is switched off.
 */
export const ADMIN_COOKIE = "cc_admin";
const ADMIN_DAYS = 14;
const ADMIN_FILE = join(LOCAL_DIR, "admin.json");
export const DISABLED_MESSAGE = "The admin dashboard is switched off. Set a password on the server: node scripts/admin-password.mjs";

function storedHash(): string | null {
  const hash = readJson<{ hash?: string }>(ADMIN_FILE, {}).hash;
  return hash && hash.startsWith("scrypt$") ? hash : null;
}

export function adminEnabled(): boolean {
  return storedHash() !== null;
}

export async function passwordMatches(candidate: string): Promise<boolean> {
  const hash = storedHash();
  if (!hash) return false;
  const [, saltHex, keyHex] = hash.split("$");
  const expected = Buffer.from(keyHex, "hex");
  const key = await scrypt(candidate, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(key, expected);
}

/** Session value tied to the current password hash, so changing the password signs everyone out. */
function sessionValue(hash: string): string {
  return createHmac("sha256", hash).update("cc-admin-session").digest("hex");
}

export async function setAdminCookie() {
  const hash = storedHash();
  if (!hash) return;
  (await cookies()).set(ADMIN_COOKIE, sessionValue(hash), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_DAYS * 86_400,
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const hash = storedHash();
  if (!hash) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!value || value.length !== 64) return false;
  return timingSafeEqual(Buffer.from(value, "hex"), Buffer.from(sessionValue(hash), "hex"));
}

/** Shared guard for admin route handlers: returns a Response to send back, or null when allowed. */
export async function requireAdmin(): Promise<Response | null> {
  if (!adminEnabled()) return Response.json({ error: DISABLED_MESSAGE }, { status: 403 });
  if (!(await isAdmin())) return Response.json({ error: "Not signed in" }, { status: 401 });
  return null;
}
