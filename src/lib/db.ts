import "server-only";
import type { Client as LibsqlClient } from "@libsql/client";
import type { Pool } from "pg";

// DATABASE_URL picks the database:
//   postgresql://user:pass@host:5432/db         - PostgreSQL (alwaysdata, any managed Postgres)
//   file:/home/<account>/data/university-compass.db  - SQLite file (VPS)
//   libsql://...  (+ TURSO_AUTH_TOKEN)          - Turso (Vercel / serverless)
// Unset: a local SQLite file for development. TURSO_DATABASE_URL is still accepted for older configs.
const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL ?? "file:unichecker.db";
export const dialect: "postgres" | "sqlite" = /^postgres(ql)?:\/\//.test(url) ? "postgres" : "sqlite";

export type Row = Record<string, unknown>;

interface Driver {
  query(sql: string, args: unknown[]): Promise<Row[]>;
}

// Timestamps are milliseconds since 1970, which overflow a Postgres INTEGER - hence BIGINT there.
const SCHEMA = {
  sqlite: [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT,
      password_hash TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, key TEXT NOT NULL,
      value TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, key))`,
    `CREATE TABLE IF NOT EXISTS outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, programme_id TEXT NOT NULL, aggregate INTEGER NOT NULL,
      year INTEGER NOT NULL, admitted INTEGER NOT NULL, reporter_hash TEXT, created_at INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS outcomes_programme ON outcomes(programme_id)`,
    `CREATE TABLE IF NOT EXISTS alerts (email TEXT PRIMARY KEY, topics TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, path TEXT, day TEXT NOT NULL,
      visitor TEXT NOT NULL, props TEXT, created_at INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS events_day ON events(day, name)`,
    `CREATE TABLE IF NOT EXISTS checker_orders (
      reference TEXT PRIMARY KEY, type TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price REAL,
      total REAL, mode TEXT NOT NULL, note TEXT, created_at INTEGER NOT NULL)`,
  ],
  postgres: [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT,
      password_hash TEXT NOT NULL, created_at BIGINT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at BIGINT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, key TEXT NOT NULL,
      value TEXT NOT NULL, updated_at BIGINT NOT NULL, PRIMARY KEY (user_id, key))`,
    `CREATE TABLE IF NOT EXISTS outcomes (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, programme_id TEXT NOT NULL, aggregate INTEGER NOT NULL,
      year INTEGER NOT NULL, admitted INTEGER NOT NULL, reporter_hash TEXT, created_at BIGINT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS outcomes_programme ON outcomes(programme_id)`,
    `CREATE TABLE IF NOT EXISTS alerts (email TEXT PRIMARY KEY, topics TEXT NOT NULL, created_at BIGINT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS events (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name TEXT NOT NULL, path TEXT, day TEXT NOT NULL,
      visitor TEXT NOT NULL, props TEXT, created_at BIGINT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS events_day ON events(day, name)`,
    `CREATE TABLE IF NOT EXISTS checker_orders (
      reference TEXT PRIMARY KEY, type TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price DOUBLE PRECISION,
      total DOUBLE PRECISION, mode TEXT NOT NULL, note TEXT, created_at BIGINT NOT NULL)`,
  ],
};

/** Queries are written with `?` placeholders; Postgres wants $1, $2, ... */
export function toPostgresPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function createDriver(): Promise<Driver> {
  if (dialect === "postgres") {
    const { Pool } = await import("pg");
    const pool: Pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_SIZE ?? 5) });
    for (const stmt of SCHEMA.postgres) await pool.query(stmt);
    return {
      async query(sql, args) {
        const r = await pool.query(toPostgresPlaceholders(sql), args);
        return r.rows as Row[];
      },
    };
  }
  const { createClient } = await import("@libsql/client");
  const client: LibsqlClient = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  // WAL lets reads continue while a write is in progress on a single SQLite file.
  if (url.startsWith("file:")) await client.execute("PRAGMA journal_mode = WAL");
  await client.batch(SCHEMA.sqlite, "write");
  return {
    async query(sql, args) {
      const r = await client.execute({ sql, args: args as never });
      return r.rows as unknown as Row[];
    },
  };
}

const globalForDb = globalThis as unknown as { __driver?: Promise<Driver> };

function driver(): Promise<Driver> {
  globalForDb.__driver ??= createDriver().catch((err) => {
    globalForDb.__driver = undefined; // retry on the next request instead of failing forever
    throw err;
  });
  return globalForDb.__driver;
}

/** Run a statement with `?` placeholders. Tables are created on first use. */
export async function query<T = Row>(sql: string, args: unknown[] = []): Promise<T[]> {
  return (await driver()).query(sql, args) as Promise<T[]>;
}
