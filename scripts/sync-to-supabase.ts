#!/usr/bin/env npx tsx
/**
 * BAMC HQ → OpenClaw Dashboard Sync
 *
 * Pulls real agent data from BAMC HQ Supabase tables (activity_log, agent_runs, tasks)
 * and writes to oc_* tables so the OpenClaw dashboard shows live data.
 *
 * Usage:
 *   npx tsx scripts/sync-to-supabase.ts          # one-shot
 *   npx tsx scripts/sync-to-supabase.ts --watch   # continuous 30s loop
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kopfxycuagqvvihwjvor.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const WATCH_MODE = process.argv.includes('--watch');
const SYNC_INTERVAL = 30_000;

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Agent definitions (the real BAMC team) ─────────────
const AGENT_DEFS: Record<string, { name: string; role: string; emoji: string; workspace: string }> = {
  soren:   { name: 'Soren Ashford',    role: 'Chief of Staff',         emoji: '🎯', workspace: 'default' },
  drake:   { name: 'Drake Montero',    role: 'Revenue Operations',     emoji: '💰', workspace: 'default' },
  sophie:  { name: 'Sophie Voss',      role: 'Data Intelligence',      emoji: '📊', workspace: 'default' },
  scout:   { name: 'Scout',            role: 'Research & Intelligence', emoji: '🔍', workspace: 'default' },
  vanta:   { name: 'Valentina Rojas',  role: 'Portfolio CMO',          emoji: '🦂', workspace: 'default' },
  julian:  { name: 'Julian Mercer',    role: 'Legal & Strategy',       emoji: '⚖️', workspace: 'default' },
  marcus:  { name: 'Marcus Reid',      role: 'Trading & Portfolio',    emoji: '📈', workspace: 'default' },
};

// ── Sync agents ────────────────────────────────────────
async function syncAgents(): Promise<number> {
  // Get currently running agents from agent_runs
  const { data: running } = await supabase
    .from('agent_runs')
    .select('agent, status, updated_at')
    .eq('status', 'running')
    .order('updated_at', { ascending: false });

  const runningSet = new Set(running?.map(r => r.agent?.toLowerCase()) || []);

  // Get recently active agents from activity_log (last 2h)
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: recentLogs } = await supabase
    .from('activity_log')
    .select('agent, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200);

  const recentAgents = new Set(recentLogs?.map(r => r.agent?.toLowerCase()) || []);

  // Build agent rows
  const agentRows = Object.entries(AGENT_DEFS).map(([id, def]) => ({
    id,
    name: def.name,
    role: def.role,
    avatar_emoji: def.emoji,
    workspace_id: def.workspace,
    status: runningSet.has(id) ? 'working' : recentAgents.has(id) ? 'working' : 'standby',
    is_master: id === 'soren' ? 1 : 0,
    source: 'local',
  }));

  const { error } = await supabase.from('oc_agents').upsert(agentRows, { onConflict: 'id' });
  if (error) console.error('[sync] agents error:', error.message);
  return agentRows.length;
}

// ── Sync tasks from BAMC HQ tasks table ────────────────
async function syncTasks(): Promise<number> {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (!tasks || tasks.length === 0) return 0;

  // Map BAMC HQ task statuses to OpenClaw statuses
  const statusMap: Record<string, string> = {
    backlog: 'inbox',
    todo: 'inbox',
    in_progress: 'in_progress',
    done: 'done',
    blocked: 'review',
  };

  const rows = tasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description || null,
    status: statusMap[t.status] || t.status || 'inbox',
    priority: t.priority > 2 ? 'urgent' : t.priority > 1 ? 'high' : 'normal',
    assigned_agent_id: t.assigned_agent || null,
    workspace_id: 'default',
    created_at: t.created_at,
    updated_at: t.updated_at,
  }));

  let synced = 0;
  // Upsert in batches
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from('oc_tasks').upsert(batch, { onConflict: 'id' });
    if (error) {
      // Try one by one
      for (const row of batch) {
        const { error: e } = await supabase.from('oc_tasks').upsert(row, { onConflict: 'id' });
        if (!e) synced++;
      }
    } else {
      synced += batch.length;
    }
  }
  return synced;
}

// ── Sync activity feed from activity_log → oc_events ──
async function syncActivityFeed(): Promise<number> {
  const { data: logs } = await supabase
    .from('activity_log')
    .select('id, agent, action, category, details, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!logs || logs.length === 0) return 0;

  const rows = logs.map(l => ({
    id: l.id,
    type: l.category || 'agent_action',
    agent_id: AGENT_DEFS[l.agent?.toLowerCase()] ? l.agent.toLowerCase() : null,
    message: l.action || '',
    metadata: l.details ? JSON.stringify({ details: l.details }) : null,
    created_at: l.created_at,
  }));

  let synced = 0;
  for (const row of rows) {
    const { error } = await supabase.from('oc_events').upsert(row, { onConflict: 'id' });
    if (!error) synced++;
  }
  return synced;
}

// ── Main sync ──────────────────────────────────────────
async function syncAll(): Promise<void> {
  const start = Date.now();
  const results: string[] = [];

  try {
    const agentCount = await syncAgents();
    if (agentCount > 0) results.push(`agents: ${agentCount}`);
  } catch (e) { console.error('[sync] agents:', (e as Error).message); }

  try {
    const taskCount = await syncTasks();
    if (taskCount > 0) results.push(`tasks: ${taskCount}`);
  } catch (e) { console.error('[sync] tasks:', (e as Error).message); }

  try {
    const eventCount = await syncActivityFeed();
    if (eventCount > 0) results.push(`events: ${eventCount}`);
  } catch (e) { console.error('[sync] events:', (e as Error).message); }

  const elapsed = Date.now() - start;
  if (results.length > 0) {
    console.log(`[sync] ${new Date().toISOString()} | ${elapsed}ms | ${results.join(', ')}`);
  }
}

// ── Entry ──────────────────────────────────────────────
async function main() {
  console.log(`[sync] BAMC HQ → OpenClaw Dashboard sync`);
  console.log(`[sync] Mode: ${WATCH_MODE ? 'watch (30s)' : 'one-shot'}`);

  await syncAll();

  if (WATCH_MODE) {
    console.log(`[sync] Watching...`);
    setInterval(syncAll, SYNC_INTERVAL);
  } else {
    console.log('[sync] Done.');
  }
}

main().catch(err => { console.error('[sync] Fatal:', err); process.exit(1); });
