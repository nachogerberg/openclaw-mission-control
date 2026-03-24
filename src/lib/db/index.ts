/**
 * Database adapter for Mission Control
 *
 * - Local dev: SQLite via better-sqlite3 (synchronous)
 * - Vercel/Production: Postgres via pg (async) with oc_ table prefix
 *
 * All exported helpers (queryAll, queryOne, run, transaction) return Promises
 * so callers must `await` them. On SQLite the Promise resolves immediately.
 */

const USE_POSTGRES = !!process.env.SUPABASE_DATABASE_URL;

// ──────────────────────────────────────────────────
// Postgres path (Vercel)
// ──────────────────────────────────────────────────
let pgMod: typeof import('./postgres') | null = null;

async function pg() {
  if (!pgMod) {
    pgMod = await import('./postgres');
  }
  return pgMod;
}

// ──────────────────────────────────────────────────
// SQLite path (local dev)
// ──────────────────────────────────────────────────
let sqliteDb: import('better-sqlite3').Database | null = null;

/* eslint-disable @typescript-eslint/no-require-imports */
function getSqliteDb(): import('better-sqlite3').Database {
  if (!sqliteDb) {
    const Database = require('better-sqlite3');
    const path = require('path');
    const fs = require('fs');

    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'mission-control.db');
    const isNew = !fs.existsSync(dbPath);

    sqliteDb = new Database(dbPath);
    sqliteDb!.pragma('journal_mode = WAL');
    sqliteDb!.pragma('foreign_keys = ON');

    const { schema } = require('./schema');
    sqliteDb!.exec(schema);

    const { runMigrations } = require('./migrations');
    runMigrations(sqliteDb);

    const { ensureCatalogSyncScheduled } = require('@/lib/agent-catalog-sync');
    ensureCatalogSyncScheduled();

    if (isNew) console.log('[DB] New SQLite database created at:', dbPath);
  }
  return sqliteDb!;
}
/* eslint-enable @typescript-eslint/no-require-imports */

// ──────────────────────────────────────────────────
// Public API — always async (Promise-based)
// ──────────────────────────────────────────────────

export async function queryAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (USE_POSTGRES) {
    const m = await pg();
    return m.pgQueryAll<T>(sql, params);
  }
  const stmt = getSqliteDb().prepare(sql);
  return stmt.all(...params) as T[];
}

export async function queryOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  if (USE_POSTGRES) {
    const m = await pg();
    return m.pgQueryOne<T>(sql, params);
  }
  const stmt = getSqliteDb().prepare(sql);
  return stmt.get(...params) as T | undefined;
}

export async function run(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
  if (USE_POSTGRES) {
    const m = await pg();
    return m.pgRun(sql, params);
  }
  const stmt = getSqliteDb().prepare(sql);
  return stmt.run(...params);
}

export async function transaction<T>(fn: () => T | Promise<T>): Promise<T> {
  if (USE_POSTGRES) {
    const m = await pg();
    return m.pgTransaction(fn as () => Promise<T>);
  }
  const db = getSqliteDb();
  return db.transaction(fn as () => T)();
}

/**
 * getDb() — returns the raw SQLite database object.
 * On Postgres, returns a proxy that logs warnings for direct .prepare() calls.
 * Callers that use getDb() directly should be migrated to use the async helpers.
 */
export function getDb(): any {
  if (USE_POSTGRES) {
    // Return a proxy that provides async-compatible methods
    // This is a compatibility shim — direct getDb() usage should be minimized
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pgMod = require('./postgres');
    return pgMod.createPgDbProxy();
  }
  return getSqliteDb();
}

export function closeDb(): void {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
}

// Export migration utilities for CLI use (SQLite only)
export { runMigrations, getMigrationStatus } from './migrations';
