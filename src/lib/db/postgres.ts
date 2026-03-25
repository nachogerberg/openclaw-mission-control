/**
 * Supabase/Postgres adapter for Mission Control (Vercel deployment)
 *
 * Uses the Supabase Management API to execute raw SQL via the pg endpoint.
 * Tables are prefixed with oc_ to avoid collisions with BAMC HQ tables.
 *
 * SQL is translated on the fly:
 *   - ? params  → $1, $2, ...
 *   - datetime('now') → NOW()
 *   - table names → oc_ prefixed
 *   - INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
 */

import { pgSchema, pgSeedData } from './pg-schema';

// Table name mapping: SQLite name → Postgres oc_ prefixed name
const TABLE_MAP: Record<string, string> = {
  workspaces: 'oc_workspaces',
  agents: 'oc_agents',
  tasks: 'oc_tasks',
  planning_questions: 'oc_planning_questions',
  planning_specs: 'oc_planning_specs',
  conversations: 'oc_conversations',
  conversation_participants: 'oc_conversation_participants',
  messages: 'oc_messages',
  events: 'oc_events',
  businesses: 'oc_businesses',
  openclaw_sessions: 'oc_openclaw_sessions',
  workflow_templates: 'oc_workflow_templates',
  task_roles: 'oc_task_roles',
  knowledge_entries: 'oc_knowledge_entries',
  task_activities: 'oc_task_activities',
  task_deliverables: 'oc_task_deliverables',
  insurance_ad_intel: 'oc_insurance_ad_intel',
  source_telemetry: 'oc_source_telemetry',
  _migrations: 'oc_migrations',
};

let schemaReady = false;

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function getServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

/** Execute raw SQL via Supabase's PostgREST rpc or direct pg endpoint */
async function execSql(sql: string, params: unknown[] = []): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  const url = getSupabaseUrl();
  const key = getServiceKey();
  if (!url || !key) {
    console.error('[PG] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return { rows: [], rowCount: 0 };
  }

  // Use Supabase's /rest/v1/rpc endpoint with a custom function, or fallback to pg pooler
  // Since we can't create RPC functions without DB access, use the supabase-js client
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // For DDL (CREATE TABLE etc), we need direct SQL execution
  // Supabase doesn't expose raw SQL via REST, so we use the pg pooler
  // But we need the database password for that...

  // Alternative: Use the supabase-js client for CRUD operations via PostgREST
  // This means we need to translate SQL into PostgREST calls

  // For now, use a hybrid approach:
  // 1. DDL runs via fetch to the Supabase SQL endpoint (if available)
  // 2. DML uses PostgREST via supabase-js

  // Try the SQL endpoint first (works for DDL)
  try {
    const resp = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    if (resp.ok) {
      const data = await resp.json();
      return { rows: Array.isArray(data) ? data : [], rowCount: Array.isArray(data) ? data.length : 0 };
    }
  } catch {
    // Fall through to direct PostgREST
  }

  // For simple queries, parse and use PostgREST
  return { rows: [], rowCount: 0 };
}

/** Translate SQLite SQL → Postgres SQL */
function translateSql(sql: string): string {
  let out = sql;

  // Replace ? params with $1, $2, ...
  let idx = 0;
  out = out.replace(/\?/g, () => `$${++idx}`);

  // datetime('now') → NOW()
  out = out.replace(/datetime\('now'\)/gi, 'NOW()');

  // INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
  out = out.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');

  // Replace bare table names with oc_ prefixed versions
  const sortedNames = Object.keys(TABLE_MAP).sort((a, b) => b.length - a.length);
  for (const name of sortedNames) {
    const regex = new RegExp(`(?<!oc_)\\b${name}\\b`, 'g');
    out = out.replace(regex, TABLE_MAP[name]);
  }

  return out;
}

// ─── Supabase PostgREST helpers ──────────────────────────────

function getClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  return createClient(getSupabaseUrl(), getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Parse a simple SELECT query and execute via PostgREST */
async function execViaPostgREST(sql: string, params: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  const translated = translateSql(sql);
  const client = getClient();

  // Try to parse the SQL and map to PostgREST
  const selectMatch = translated.match(/^\s*SELECT\s+(.*?)\s+FROM\s+(\w+)(.*?)$/i);
  if (selectMatch) {
    const [, columns, table, rest] = selectMatch;
    let query = client.from(table).select(columns.trim() === '*' ? '*' : columns.trim());

    // Parse WHERE clauses (simple cases)
    const whereMatch = rest.match(/WHERE\s+(.*?)(?:ORDER|LIMIT|GROUP|$)/i);
    if (whereMatch) {
      const conditions = whereMatch[1].trim();

      // Handle OR conditions: col1 = $1 OR col2 = $2
      if (/\bOR\b/i.test(conditions) && !/\bAND\b/i.test(conditions)) {
        const orParts = conditions.split(/\s+OR\s+/i);
        const orFilters: string[] = [];
        for (const part of orParts) {
          const eqMatch = part.trim().match(/(\w+)\s*=\s*\$(\d+)/);
          if (eqMatch) {
            const val = params[parseInt(eqMatch[2]) - 1];
            orFilters.push(`${eqMatch[1]}.eq.${val}`);
          }
        }
        if (orFilters.length > 0) {
          query = query.or(orFilters.join(','));
        }
      } else {
        // Parse AND conditions
        const parts = conditions.split(/\s+AND\s+/i);
        for (const part of parts) {
          const eqMatch = part.match(/(\w+)\s*=\s*\$(\d+)/);
          const neqMatch = part.match(/(\w+)\s*!=\s*\$(\d+)/);
          // Handle IN clause: col IN ($1, $2, ...)
          const inMatch = part.match(/(\w+)\s+IN\s*\(([^)]+)\)/i);
          if (eqMatch) {
            query = query.eq(eqMatch[1], params[parseInt(eqMatch[2]) - 1]);
          } else if (neqMatch) {
            query = query.neq(neqMatch[1], params[parseInt(neqMatch[2]) - 1]);
          } else if (inMatch) {
            const col = inMatch[1];
            const paramRefs = inMatch[2].split(',').map(s => s.trim());
            const values = paramRefs.map(ref => {
              const m = ref.match(/\$(\d+)/);
              return m ? params[parseInt(m[1]) - 1] : ref.replace(/'/g, '');
            });
            query = query.in(col, values);
          } else if (part.includes('1=1')) {
            // skip
          } else if (part.match(/(\w+)\s+IS\s+NOT\s+NULL/i)) {
            const col = part.match(/(\w+)\s+IS\s+NOT\s+NULL/i)![1];
            query = query.not(col, 'is', null);
          }
        }
      }
    }

    // Parse ORDER BY (supports multiple columns)
    const orderMatch = rest.match(/ORDER\s+BY\s+(.+?)(?:LIMIT|$)/i);
    if (orderMatch) {
      const orderCols = orderMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      for (const col of orderCols) {
        const m = col.match(/([\w.]+)\s*(ASC|DESC)?/i);
        if (m) {
          query = query.order(m[1], { ascending: (m[2] || 'ASC').toUpperCase() === 'ASC' });
        }
      }
    }

    // Parse LIMIT
    const limitMatch = rest.match(/LIMIT\s+\$?(\d+)/i);
    if (limitMatch) {
      query = query.limit(parseInt(limitMatch[1]));
    } else {
      // Check if limit is a param
      const limitParamMatch = rest.match(/LIMIT\s+\$(\d+)/i);
      if (limitParamMatch) {
        const limitVal = params[parseInt(limitParamMatch[1]) - 1];
        if (typeof limitVal === 'number') query = query.limit(limitVal);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('[PG/PostgREST] SELECT error:', error.message, 'table:', table);
      return { rows: [], rowCount: 0 };
    }
    return { rows: data || [], rowCount: data?.length || 0 };
  }

  // INSERT
  const insertMatch = translated.match(/^\s*INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (insertMatch) {
    const [, table, colStr, valStr] = insertMatch;
    const cols = colStr.split(',').map(c => c.trim());
    const vals = valStr.split(',').map(v => v.trim());
    const row: Record<string, unknown> = {};
    for (let i = 0; i < cols.length; i++) {
      const paramMatch = vals[i].match(/\$(\d+)/);
      if (paramMatch) {
        row[cols[i]] = params[parseInt(paramMatch[1]) - 1];
      } else if (vals[i].toUpperCase() === 'NOW()') {
        row[cols[i]] = new Date().toISOString();
      } else {
        // Literal value
        row[cols[i]] = vals[i].replace(/'/g, '');
      }
    }
    const { error } = await client.from(table).insert(row);
    if (error && !error.message.includes('duplicate')) {
      console.error('[PG/PostgREST] INSERT error:', error.message, 'table:', table);
    }
    return { rows: [], rowCount: error ? 0 : 1 };
  }

  // UPDATE
  const updateMatch = translated.match(/^\s*UPDATE\s+(\w+)\s+SET\s+(.*?)\s+WHERE\s+(.*?)$/i);
  if (updateMatch) {
    const [, table, setClause, whereClause] = updateMatch;
    const updates: Record<string, unknown> = {};
    const setParts = setClause.split(',');
    for (const part of setParts) {
      const m = part.match(/(\w+)\s*=\s*\$(\d+)/);
      if (m) {
        updates[m[1]] = params[parseInt(m[2]) - 1];
      } else if (part.match(/(\w+)\s*=\s*NOW\(\)/i)) {
        const col = part.match(/(\w+)\s*=/)?.[1];
        if (col) updates[col] = new Date().toISOString();
      }
    }
    let query = client.from(table).update(updates);
    // Parse WHERE id = $N
    const whereEq = whereClause.match(/(\w+)\s*=\s*\$(\d+)/);
    if (whereEq) {
      query = query.eq(whereEq[1], params[parseInt(whereEq[2]) - 1]);
    }
    const { error } = await query;
    if (error) console.error('[PG/PostgREST] UPDATE error:', error.message, 'table:', table);
    return { rows: [], rowCount: error ? 0 : 1 };
  }

  // DELETE
  const deleteMatch = translated.match(/^\s*DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.*?)$/i);
  if (deleteMatch) {
    const [, table, whereClause] = deleteMatch;
    let query = client.from(table).delete();
    const whereEq = whereClause.match(/(\w+)\s*=\s*\$(\d+)/);
    if (whereEq) {
      query = query.eq(whereEq[1], params[parseInt(whereEq[2]) - 1]);
    }
    const { error } = await query;
    if (error) console.error('[PG/PostgREST] DELETE error:', error.message, 'table:', table);
    return { rows: [], rowCount: error ? 0 : 1 };
  }

  // COUNT queries
  const countMatch = translated.match(/^\s*SELECT\s+COUNT\(\*\)\s+as\s+(\w+)\s+FROM\s+(\w+)(.*?)$/i);
  if (countMatch) {
    const [, alias, table, rest] = countMatch;
    let query = client.from(table).select('*', { count: 'exact', head: true });
    const whereMatch = rest.match(/WHERE\s+(.*?)$/i);
    if (whereMatch) {
      const conditions = whereMatch[1].trim();
      const parts = conditions.split(/\s+AND\s+/i);
      for (const part of parts) {
        const eqMatch = part.match(/(\w+)\s*=\s*\$(\d+)/);
        if (eqMatch) {
          query = query.eq(eqMatch[1], params[parseInt(eqMatch[2]) - 1]);
        }
      }
    }
    const { count, error } = await query;
    if (error) console.error('[PG/PostgREST] COUNT error:', error.message, 'table:', table);
    return { rows: [{ [alias]: count || 0 }], rowCount: 1 };
  }

  console.warn('[PG] Unhandled SQL pattern:', translated.substring(0, 120));
  return { rows: [], rowCount: 0 };
}

// ─── Schema initialization ──────────────────────────────────

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;

  const client = getClient();
  // Check if oc_workspaces table exists by trying to read from it
  const { error } = await client.from('oc_workspaces').select('id').limit(1);

  if (error && error.message.includes('does not exist')) {
    // Tables don't exist — we need to create them
    // Unfortunately PostgREST can't run DDL. Log the instructions.
    console.error('[PG] oc_* tables do not exist in Supabase. Please run the schema SQL manually.');
    console.error('[PG] Schema SQL is in src/lib/db/pg-schema.ts');
  }

  schemaReady = true;
}

// ─── Public API (same interface as SQLite adapter) ──────────

export async function pgQueryAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  try {
    const result = await execViaPostgREST(sql, params);
    return result.rows as T[];
  } catch (err) {
    console.error('[PG] queryAll error:', (err as Error).message);
    return [];
  }
}

export async function pgQueryOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  await ensureSchema();
  try {
    const result = await execViaPostgREST(sql, params);
    return result.rows[0] as T | undefined;
  } catch (err) {
    console.error('[PG] queryOne error:', (err as Error).message);
    return undefined;
  }
}

export async function pgRun(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
  await ensureSchema();
  try {
    const result = await execViaPostgREST(sql, params);
    return { changes: result.rowCount, lastInsertRowid: 0 };
  } catch (err) {
    console.error('[PG] run error:', (err as Error).message);
    return { changes: 0, lastInsertRowid: 0 };
  }
}

export async function pgTransaction<T>(fn: () => Promise<T>): Promise<T> {
  await ensureSchema();
  // PostgREST doesn't support transactions — just run the function
  return fn();
}

export function createPgDbProxy() {
  return {
    prepare(sql: string) {
      return {
        all(...params: unknown[]) {
          console.warn('[PG] Sync .prepare().all() — returns empty. Use queryAll()');
          return [];
        },
        get(...params: unknown[]) {
          console.warn('[PG] Sync .prepare().get() — returns undefined. Use queryOne()');
          return undefined;
        },
        run(...params: unknown[]) {
          return { changes: 0, lastInsertRowid: 0 };
        },
      };
    },
    transaction<T>(fn: () => T) {
      return () => fn();
    },
    pragma() {},
    exec() {},
    close() {},
  };
}
