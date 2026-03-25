import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryAll, run } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/workspaces/[id] - Get a single workspace
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const workspace = await queryOne(
      'SELECT * FROM workspaces WHERE id = ? OR slug = ?',
      [id, id]
    );

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error('Failed to fetch workspace:', error);
    return NextResponse.json({ error: 'Failed to fetch workspace' }, { status: 500 });
  }
}

// PATCH /api/workspaces/[id] - Update a workspace
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { name, description, icon } = body;

    const existing = await queryOne('SELECT * FROM workspaces WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await run(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`, values);

    const workspace = await queryOne('SELECT * FROM workspaces WHERE id = ?', [id]);
    return NextResponse.json(workspace);
  } catch (error) {
    console.error('Failed to update workspace:', error);
    return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id] - Delete a workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    if (id === 'default') {
      return NextResponse.json({ error: 'Cannot delete the default workspace' }, { status: 400 });
    }

    const existing = await queryOne('SELECT * FROM workspaces WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const taskCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM tasks WHERE workspace_id = ?', [id]);
    const agentCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM agents WHERE workspace_id = ?', [id]);

    if ((taskCount?.count ?? 0) > 0 || (agentCount?.count ?? 0) > 0) {
      return NextResponse.json({
        error: 'Cannot delete workspace with existing tasks or agents',
        taskCount: taskCount?.count ?? 0,
        agentCount: agentCount?.count ?? 0
      }, { status: 400 });
    }

    await run('DELETE FROM workflow_templates WHERE workspace_id = ?', [id]);
    await run('DELETE FROM knowledge_entries WHERE workspace_id = ?', [id]);
    await run('DELETE FROM workspaces WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
  }
}
