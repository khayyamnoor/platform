import { createDb } from "@platform/db";

/**
 * Singleton Drizzle client for the apps/web request lifecycle. Lazily
 * created on first call so import-time validation does not run during
 * `next build`'s module-graph walk (DATABASE_URL is only required at
 * request time, not at build time).
 */
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set; cannot connect to Postgres");
  }
  _db = createDb(url);
  return _db;
}
