import { queryAll, queryOne, run, transaction } from '@/lib/db';
import { getOpenClawClient } from '@/lib/openclaw/client';

interface GatewayAgent {
  id?: string;
  name?: string;
  label?: string;
  model?: string;
}

const SYNC_INTERVAL_MS = Number(process.env.AGENT_CATALOG_SYNC_INTERVAL_MS || 60_000);
let lastSyncAt = 0;
let syncing: Promise<number> | null = null;

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function inferWorkspace(name: string): string {
  const n = normalizeName(name);
  if (n.includes('drake')) return 'reclutas';
  if (n.includes('aura') || n.includes('vanta') || n.includes('sienna') || n.includes('mason')) return 'engage';
  if (n.includes('marcus')) return 'manta';
  if (n.includes('insurex')) return 'insurex';
  return 'default';
}

function inferEmoji(name: string): string {
  const n = normalizeName(name);
  if (n.includes('soren')) return '🧠';
  if (n.includes('sophie')) return '📊';
  if (n.includes('drake')) return '💼';
  if (n.includes('vanta')) return '✨';
  if (n.includes('sienna')) return '🎨';
  if (n.includes('mason')) return '⚙️';
  if (n.includes('marcus')) return '📉';
  if (n.includes('scout')) return '🛰️';
  if (n.includes('atlas')) return '🗺️';
  if (n.includes('aura')) return '🔥';
  return '🔗';
}

function normalizeRole(name: string): string {
  const n = normalizeName(name);
  if (n.includes('soren')) return 'chief_of_staff';
  if (n.includes('sophie')) return 'data_intelligence';
  if (n.includes('drake')) return 'revenue_ops';
  if (n.includes('vanta')) return 'portfolio_cmo';
  if (n.includes('sienna')) return 'creative_performance';
  if (n.includes('mason')) return 'revenue_operations';
  if (n.includes('marcus')) return 'trading_ops';
  if (n.includes('scout')) return 'research';
  if (n.includes('atlas')) return 'mission_control_pm';
  if (n.includes('aura')) return 'engage_primary';
  if (n.includes('learn')) return 'learner';
  if (n.includes('test')) return 'tester';
  if (n.includes('review') || n.includes('verif')) return 'reviewer';
  if (n.includes('fix')) return 'fixer';
  if (n.includes('senior')) return 'senior';
  if (n.includes('plan') || n.includes('orch')) return 'orchestrator';
  return 'builder';
}

export async function syncGatewayAgentsToCatalog(options?: { force?: boolean; reason?: string }): Promise<number> {
  const force = Boolean(options?.force);
  const now = Date.now();
  if (!force && now - lastSyncAt < SYNC_INTERVAL_MS) {
    return 0;
  }

  if (syncing) return syncing;

  syncing = (async () => {
    const client = getOpenClawClient();
    if (!client.isConnected()) {
      await client.connect();
    }

    const gatewayAgents = (await client.listAgents()) as GatewayAgent[];
    const existing = await queryAll<{ id: string; gateway_agent_id: string | null; name: string }>(
      `SELECT id, gateway_agent_id, name FROM agents`
    );
    const existingByGatewayId = new Map(existing.filter((a) => a.gateway_agent_id).map((a) => [a.gateway_agent_id, a.id]));
    const existingByName = new Map(existing.map((a) => [normalizeName(a.name), a.id]));

    let changed = 0;
    const ts = new Date().toISOString();

    await transaction(async () => {
      for (const ga of gatewayAgents) {
        const gatewayId = ga.id || ga.name;
        if (!gatewayId) continue;

        const name = ga.name || ga.label || gatewayId;
        const role = normalizeRole(name);
        const workspaceId = inferWorkspace(name);
        const avatar = inferEmoji(name);
        const existingId = existingByGatewayId.get(gatewayId) || existingByName.get(normalizeName(name)) || null;

        if (existingId) {
          await run(
            `UPDATE agents
             SET name = ?, role = ?, workspace_id = COALESCE(workspace_id, ?), avatar_emoji = COALESCE(NULLIF(avatar_emoji, '🤖'), ?),
                 model = COALESCE(?, model), source = 'gateway', gateway_agent_id = COALESCE(gateway_agent_id, ?), updated_at = ?
             WHERE id = ?`,
            [name, role, workspaceId, avatar, ga.model || null, gatewayId, ts, existingId]
          );
        } else {
          await run(
            `INSERT INTO agents (id, name, role, description, avatar_emoji, is_master, workspace_id, model, source, gateway_agent_id, created_at, updated_at)
             VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 0, ?, ?, 'gateway', ?, ?, ?)`,
            [name, role, `Auto-synced from OpenClaw (${gatewayId})`, avatar, workspaceId, ga.model || null, gatewayId, ts, ts]
          );
        }
        changed += 1;
      }

      await run(
        `INSERT INTO events (id, type, message, metadata, created_at)
         VALUES (lower(hex(randomblob(16))), 'system', ?, ?, ?)`,
        [
          `Agent catalog sync completed (${options?.reason || 'automatic'})`,
          JSON.stringify({ changed, reason: options?.reason || 'automatic' }),
          ts,
        ]
      );
    });

    lastSyncAt = Date.now();
    return changed;
  })();

  try {
    return await syncing;
  } finally {
    syncing = null;
  }
}

export function ensureCatalogSyncScheduled(): void {
  if (process.env.NODE_ENV === 'test') return;
  const g = globalThis as unknown as { __mcAgentCatalogTimer?: NodeJS.Timeout };
  if (g.__mcAgentCatalogTimer) return;
  g.__mcAgentCatalogTimer = setInterval(() => {
    syncGatewayAgentsToCatalog({ reason: 'scheduled' }).catch((err) => {
      console.error('[AgentCatalog] scheduled sync failed:', err);
    });
  }, SYNC_INTERVAL_MS);
  syncGatewayAgentsToCatalog({ reason: 'startup' }).catch((err) => {
    console.error('[AgentCatalog] startup sync failed:', err);
  });
}

export async function getAgentByPreferredRoles(taskId: string, preferredRoles: string[]): Promise<{ id: string; name: string } | null> {
  for (const role of preferredRoles) {
    const byTaskRole = await queryOne<{ id: string; name: string }>(
      `SELECT a.id, a.name
       FROM task_roles tr
       JOIN agents a ON a.id = tr.agent_id
       WHERE tr.task_id = ? AND tr.role = ? AND a.status != 'offline'
       LIMIT 1`,
      [taskId, role]
    );
    if (byTaskRole) return byTaskRole;

    const byGlobalRole = await queryOne<{ id: string; name: string }>(
      `SELECT id, name FROM agents WHERE role = ? AND status != 'offline' ORDER BY updated_at DESC LIMIT 1`,
      [role]
    );
    if (byGlobalRole) return byGlobalRole;
  }
  return null;
}
