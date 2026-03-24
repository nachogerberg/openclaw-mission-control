import test from 'node:test';
import assert from 'node:assert/strict';
import { run, queryOne } from './db';
import {
  hasStageEvidence,
  taskCanBeDone,
  ensureFixerExists,
  getFailureCountInStage,
} from './task-governance';

async function seedTask(id: string, workspace = 'default') {
  await run(
    `INSERT INTO tasks (id, title, status, priority, workspace_id, business_id, created_at, updated_at)
     VALUES (?, 'T', 'review', 'normal', ?, 'default', datetime('now'), datetime('now'))`,
    [id, workspace]
  );
}

test('evidence gate requires deliverable + activity', async () => {
  const taskId = crypto.randomUUID();
  await seedTask(taskId);

  assert.equal(await hasStageEvidence(taskId), false);

  await run(
    `INSERT INTO task_deliverables (id, task_id, deliverable_type, title, created_at)
     VALUES (lower(hex(randomblob(16))), ?, 'file', 'index.html', datetime('now'))`,
    [taskId]
  );
  assert.equal(await hasStageEvidence(taskId), false);

  await run(
    `INSERT INTO task_activities (id, task_id, activity_type, message, created_at)
     VALUES (lower(hex(randomblob(16))), ?, 'completed', 'did thing', datetime('now'))`,
    [taskId]
  );

  assert.equal(await hasStageEvidence(taskId), true);
});

test('task cannot be done when status_reason indicates failure', async () => {
  const taskId = crypto.randomUUID();
  await seedTask(taskId);

  await run(`UPDATE tasks SET status_reason = 'Validation failed: CSS broken' WHERE id = ?`, [taskId]);
  await run(
    `INSERT INTO task_deliverables (id, task_id, deliverable_type, title, created_at)
     VALUES (lower(hex(randomblob(16))), ?, 'file', 'index.html', datetime('now'))`,
    [taskId]
  );
  await run(
    `INSERT INTO task_activities (id, task_id, activity_type, message, created_at)
     VALUES (lower(hex(randomblob(16))), ?, 'completed', 'did thing', datetime('now'))`,
    [taskId]
  );

  assert.equal(await taskCanBeDone(taskId), false);
});

test('ensureFixerExists creates fixer when missing', async () => {
  const fixer = await ensureFixerExists('default');
  assert.equal(fixer.created, true);

  const stored = await queryOne<{ id: string; role: string }>('SELECT id, role FROM agents WHERE id = ?', [fixer.id]);
  assert.ok(stored);
  assert.equal(stored?.role, 'fixer');
});

test('failure counter reads status_changed failure events', async () => {
  const taskId = crypto.randomUUID();
  await seedTask(taskId);

  await run(
    `INSERT INTO task_activities (id, task_id, activity_type, message, created_at)
     VALUES (lower(hex(randomblob(16))), ?, 'status_changed', 'Stage failed: verification → in_progress (reason: x)', datetime('now'))`,
    [taskId]
  );
  await run(
    `INSERT INTO task_activities (id, task_id, activity_type, message, created_at)
     VALUES (lower(hex(randomblob(16))), ?, 'status_changed', 'Stage failed: verification → in_progress (reason: y)', datetime('now'))`,
    [taskId]
  );

  assert.equal(await getFailureCountInStage(taskId, 'verification'), 2);
});
