import "server-only";
import { createClient, type Client } from "@libsql/client";

// Local dev: a SQLite file. Production: a free Turso database (set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN).
const url = process.env.TURSO_DATABASE_URL ?? "file:unichecker.db";

const globalForDb = globalThis as unknown as { __db?: Client; __dbReady?: Promise<void> };

export const db: Client = globalForDb.__db ?? createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
globalForDb.__db = db;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, key)
  )`,
  `CREATE TABLE IF NOT EXISTS outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    programme_id TEXT NOT NULL,
    aggregate INTEGER NOT NULL,
    year INTEGER NOT NULL,
    admitted INTEGER NOT NULL,
    reporter_hash TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS outcomes_programme ON outcomes(programme_id)`,
  `CREATE TABLE IF NOT EXISTS alerts (
    email TEXT PRIMARY KEY,
    topics TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
];

export function ready(): Promise<void> {
  globalForDb.__dbReady ??= (async () => {
    await db.batch(SCHEMA, "write");
  })();
  return globalForDb.__dbReady;
}
