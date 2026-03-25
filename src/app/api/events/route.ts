import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, run } from '@/lib/db';
import type { Event } from '@/lib/types';

export const dynamic = 'force-dynamic';
// GET /api/events - List events (live feed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const since = searchParams.get('since'); // ISO timestamp for polling

    // Simple queries without JOINs for PostgREST compatibility
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params: unknown[] = [];

    if (since) {
      sql += ' AND created_at > ?';
      params.push(since);
    }

    sql += ' ORDER BY created_at DESC';

    const events = await queryAll<Event>(sql, params);
    const limited = events.slice(0, limit);

    // Fetch agents + tasks for name resolution
    const agents = await queryAll<{ id: string; name: string; avatar_emoji: string }>('SELECT id, name, avatar_emoji FROM agents');
    const tasks = await queryAll<{ id: string; title: string }>('SELECT id, title FROM tasks');
    const agentMap = new Map(agents.map(a => [a.id, a]));
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    const transformedEvents = limited.map((event) => {
      const agent = event.agent_id ? agentMap.get(event.agent_id) : undefined;
      const task = event.task_id ? taskMap.get(event.task_id) : undefined;
      return {
        ...event,
        agent_name: agent?.name ?? null,
        agent_emoji: agent?.avatar_emoji ?? null,
        task_title: task?.title ?? null,
        agent: agent ? { id: event.agent_id, name: agent.name, avatar_emoji: agent.avatar_emoji } : undefined,
        task: task ? { id: event.task_id, title: task.title } : undefined,
      };
    });

    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST /api/events - Create a manual event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.type || !body.message) {
      return NextResponse.json({ error: 'Type and message are required' }, { status: 400 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await run(
      `INSERT INTO events (id, type, agent_id, task_id, message, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.type,
        body.agent_id || null,
        body.task_id || null,
        body.message,
        body.metadata ? JSON.stringify(body.metadata) : null,
        now,
      ]
    );

    return NextResponse.json({ id, type: body.type, message: body.message, created_at: now }, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
