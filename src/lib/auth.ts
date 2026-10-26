import "server-only";
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { query } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "uc_session";
const SESSION_DAYS = 60;

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, saltHex, keyHex] = stored.split("$");
  if (!saltHex || !keyHex) return false;
  const key = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(keyHex, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createUser(email: string, password: string, name: string | null): Promise<SessionUser> {
  const id = randomUUID();
  await query("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)", [
    id, email, name, await hashPassword(password), Date.now(),
  ]);
  return { id, email, name };
}

export async function findUserByEmail(email: string) {
  const rows = await query<SessionUser & { password_hash: string }>(
    "SELECT id, email, name, password_hash FROM users WHERE email = ?",
    [email],
  );
  return rows[0];
}

export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  await query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [sha256(token), userId, expires]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await query("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);
  }
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Accounts are optional - most callers just get null. */
export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await query(
    `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    [sha256(token), Date.now()],
  );
  return row ? { id: String(row.id), email: String(row.email), name: row.name ? String(row.name) : null } : null;
}

/** Tiny in-memory limiter for auth endpoints (per server instance). */
const attempts = new Map<string, { count: number; reset: number }>();
export function rateLimited(key: string, max = 10, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.reset < now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  a.count++;
  return a.count > max;
}

export function clientKey(req: Request): string {
  return sha256(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local");
}
