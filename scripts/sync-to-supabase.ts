#!/usr/bin/env npx tsx
/**
 * SQLite → Supabase Sync Script
 *
 * Reads from local mission-control.db and upserts to Supabase oc_* tables.
 * Run on a 30s interval to keep the Vercel dashboard in sync with local agents.
 *
 * Usage:
 *   npx tsx scripts/sync-to-supabase.ts          # one-shot sync
 *   npx tsx scripts/sync-to-supabase.ts --watch   # continuous 30s loop
 */

import Database from 'better-sqlite3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';

// ── Config ──────────────────────────────────────────
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'mission-control.db');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kopfxycuagqvvihwjvor.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const WATCH_MODE = process.argv.includes('--watch');
const SYNC_INTERVAL = 30_000; // 30 seconds

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local or as env var.');
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Table sync definitions ──────────────────────────

interface SyncTable {
  sqlite: string;
  pg: string;
  idCol: string;
  /** columns to sync (null = all) */
  columns?: string[];
  /** transform row before upsert */
  transform?: (row: Record<string, unknown>) => Record<string, unknown>;
}

const SYNC_TABLES: SyncTable[] = [
  {
    sqlite: 'workspaces',
    pg: 'oc_workspaces',
    idCol: 'id',
  },
  {
    sqlite: 'agents',
    pg: 'oc_agents',
    idCol: 'id',
  },
  {
    sqlite: 'tasks',
    pg: 'oc_tasks',
    idCol: 'id',
  },
  {
    sqlite: 'events',
    pg: 'oc_events',
    idCol: 'id',
  },
  {
    sqlite: 'task_activities',
    pg: 'oc_task_activities',
    idCol: 'id',
  },
  {
    sqlite: 'openclaw_sessions',
    pg: 'oc_openclaw_sessions',
    idCol: 'id',
  },
  {
    sqlite: 'task_roles',
    pg: 'oc_task_roles',
    idCol: 'id',
  },
  {
    sqlite: 'task_deliverables',
    pg: 'oc_task_deliverables',
    idCol: 'id',
  },
  {
    sqlite: 'knowledge_entries',
    pg: 'oc_knowledge_entries',
    idCol: 'id',
  },
  {
    sqlite: 'workflow_templates',
    pg: 'oc_workflow_templates',
    idCol: 'id',
  },
];

// ── Sync logic ──────────────────────────────────────

async function syncTable(table: SyncTable): Promise<number> {
  const rows = db.prepare(`SELECT * FROM ${table.sqlite}`).all() as Record<string, unknown>[];
  if (rows.length === 0) return 0;

  // Transform rows if needed
  const transformed = table.transform ? rows.map(table.transform) : rows;

  // Upsert in batches of 50
  let synced = 0;
  for (let i = 0; i < transformed.length; i += 50) {
    const batch = transformed.slice(i, i + 50);

    const { error } = await supabase
      .from(table.pg)
      .upsert(batch, { onConflict: table.idCol, ignoreDuplicates: false });

    if (error) {
      // Try one-by-one if batch fails (usually constraint issues)
      for (const row of batch) {
        const { error: singleErr } = await supabase
          .from(table.pg)
          .upsert(row, { onConflict: table.idCol });
        if (singleErr) {
          console.warn(`  [${table.pg}] skip ${row[table.idCol]}: ${singleErr.message}`);
        } else {
          synced++;
        }
      }
    } else {
      synced += batch.length;
    }
  }

  return synced;
}

async function syncAll(): Promise<void> {
  const start = Date.now();
  const results: string[] = [];

  for (const table of SYNC_TABLES) {
    try {
      const count = await syncTable(table);
      if (count > 0) {
        results.push(`${table.pg}: ${count}`);
      }
    } catch (err) {
      console.error(`  [${table.pg}] error:`, (err as Error).message);
    }
  }

  const elapsed = Date.now() - start;
  if (results.length > 0) {
    console.log(`[sync] ${new Date().toISOString()} | ${elapsed}ms | ${results.join(', ')}`);
  } else {
    // Quiet mode — only log every 10th cycle if nothing changed
    if (Math.random() < 0.1) {
      console.log(`[sync] ${new Date().toISOString()} | ${elapsed}ms | no changes`);
    }
  }
}

// ── Main ────────────────────────────────────────────

async function main() {
  console.log(`[sync] Starting SQLite→Supabase sync`);
  console.log(`[sync] DB: ${DB_PATH}`);
  console.log(`[sync] Supabase: ${SUPABASE_URL}`);
  console.log(`[sync] Mode: ${WATCH_MODE ? 'watch (30s interval)' : 'one-shot'}`);
  console.log('');

  // Initial sync
  await syncAll();

  if (WATCH_MODE) {
    console.log(`[sync] Watching for changes every ${SYNC_INTERVAL / 1000}s...`);
    setInterval(syncAll, SYNC_INTERVAL);
  } else {
    db.close();
    console.log('[sync] Done.');
  }
}

main().catch((err) => {
  console.error('[sync] Fatal:', err);
  process.exit(1);
});
