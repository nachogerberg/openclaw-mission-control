import { queryAll, queryOne, run, transaction } from '@/lib/db';
import { notifyLearner } from '@/lib/learner';
import type { Task } from '@/lib/types';

const ACTIVE_STATUSES = ['assigned', 'in_progress', 'testing', 'review', 'verification'];

export async function hasStageEvidence(taskId: string): Promise<boolean> {
  const deliverable = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM task_deliverables WHERE task_id = ?', [taskId]);
  const activity = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM task_activities WHERE task_id = ? AND activity_type IN ('completed','file_created','updated')`,
    [taskId]
  );
  return Number(deliverable?.count || 0) > 0 && Number(activity?.count || 0) > 0;
}

export function canUseBoardOverride(request: Request): boolean {
  if (process.env.BOARD_OVERRIDE_ENABLED !== 'true') return false;
  return request.headers.get('x-mc-board-override') === 'true';
}

export async function auditBoardOverride(taskId: string, fromStatus: string, toStatus: string, reason?: string): Promise<void> {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO events (id, type, task_id, message, metadata, created_at)
     VALUES (lower(hex(randomblob(16))), 'system', ?, ?, ?, ?)`,
    [taskId, `Board override: ${fromStatus} → ${toStatus}`, JSON.stringify({ boardOverride: true, reason: reason || null }), now]
  );
}

export async function getFailureCountInStage(taskId: string, stage: string): Promise<number> {
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM task_activities
     WHERE task_id = ? AND activity_type = 'status_changed' AND message LIKE ?`,
    [taskId, `%Stage failed: ${stage}%`]
  );
  return Number(row?.count || 0);
}

export async function ensureFixerExists(workspaceId: string): Promise<{ id: string; name: string; created: boolean }> {
  const existing = await queryOne<{ id: string; name: string }>(
    `SELECT id, name FROM agents WHERE workspace_id = ? AND role IN ('fixer','senior') AND status != 'offline' ORDER BY role = 'fixer' DESC, updated_at DESC LIMIT 1`,
    [workspaceId]
  );
  if (existing) return { ...existing, created: false };

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const name = 'Auto Fixer';
  await run(
    `INSERT INTO agents (id, name, role, description, avatar_emoji, status, is_master, workspace_id, source, created_at, updated_at)
     VALUES (?, ?, 'fixer', 'Auto-created fixer for repeated stage failures', '🛠️', 'standby', 0, ?, 'local', ?, ?)`,
    [id, name, workspaceId, now, now]
  );
  return { id, name, created: true };
}

export async function escalateFailureIfNeeded(taskId: string, stage: string): Promise<void> {
  const task = await queryOne<Task>('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) return;

  if (await getFailureCountInStage(taskId, stage) < 2) return;

  const fixer = await ensureFixerExists(task.workspace_id);
  const now = new Date().toISOString();
  await transaction(async () => {
    await run('UPDATE tasks SET assigned_agent_id = ?, status_reason = ?, updated_at = ? WHERE id = ?', [
      fixer.id,
      `Escalated after repeated failures in ${stage}`,
      now,
      taskId,
    ]);

    await run(
      `INSERT OR REPLACE INTO task_roles (id, task_id, role, agent_id, created_at)
       VALUES (COALESCE((SELECT id FROM task_roles WHERE task_id = ? AND role = 'fixer'), lower(hex(randomblob(16)))), ?, 'fixer', ?, ?)`,
      [taskId, taskId, fixer.id, now]
    );

    await run(
      `INSERT INTO task_activities (id, task_id, agent_id, activity_type, message, created_at)
       VALUES (lower(hex(randomblob(16))), ?, ?, 'status_changed', ?, ?)`,
      [taskId, fixer.id, `Escalated to ${fixer.name} after repeated failures in ${stage}`, now]
    );
  });

  if (fixer.created) {
    await notifyLearner(taskId, {
      previousStatus: stage,
      newStatus: stage,
      passed: true,
      context: `Auto-created fixer agent (${fixer.name}) due to repeated stage failures.`,
    });
  }
}

export async function recordLearnerOnTransition(taskId: string, previousStatus: string, newStatus: string, passed = true, failReason?: string): Promise<void> {
  await notifyLearner(taskId, { previousStatus, newStatus, passed, failReason });
}

export async function taskCanBeDone(taskId: string): Promise<boolean> {
  const task = await queryOne<{ status: string; status_reason?: string }>('SELECT status, status_reason FROM tasks WHERE id = ?', [taskId]);
  if (!task) return false;
  const hasValidationFailure = (task.status_reason || '').toLowerCase().includes('fail');
  return !hasValidationFailure && await hasStageEvidence(taskId);
}

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export async function pickDynamicAgent(taskId: string, stageRole?: string | null): Promise<{ id: string; name: string } | null> {
  const planningAgentsTask = await queryOne<{ planning_agents?: string }>('SELECT planning_agents FROM tasks WHERE id = ?', [taskId]);
  const plannerCandidates: string[] = [];
  if (planningAgentsTask?.planning_agents) {
    try {
      const parsed = JSON.parse(planningAgentsTask.planning_agents) as Array<{ agent_id?: string; role?: string }>;
      for (const a of parsed) {
        if (a.role && stageRole && a.role.toLowerCase().includes(stageRole.toLowerCase()) && a.agent_id) plannerCandidates.push(a.agent_id);
      }
    } catch {}
  }

  const checked = new Set<string>();
  for (const candidateId of plannerCandidates) {
    const candidate = await queryOne<{ id: string; name: string; is_master: number; status: string }>(
      'SELECT id, name, is_master, status FROM agents WHERE id = ? LIMIT 1',
      [candidateId]
    );
    if (!candidate || candidate.status === 'offline') continue;
    checked.add(candidate.id);
    return { id: candidate.id, name: candidate.name };
  }

  if (stageRole) {
    const byRole = await queryOne<{ id: string; name: string }>(
      `SELECT id, name FROM agents WHERE role = ? AND status != 'offline' ORDER BY status = 'standby' DESC, updated_at DESC LIMIT 1`,
      [stageRole]
    );
    if (byRole) return byRole;
  }

  const fallback = await queryOne<{ id: string; name: string }>(
    `SELECT id, name FROM agents WHERE status != 'offline' ORDER BY is_master ASC, updated_at DESC LIMIT 1`
  );
  if (fallback && !checked.has(fallback.id)) return fallback;

  return null;
}
