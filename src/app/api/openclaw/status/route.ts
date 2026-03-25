import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/openclaw/status - Check connection status
// On Vercel: derive status from agent data in Supabase (no local gateway)
// Locally: try the real OpenClaw gateway
export async function GET() {
  try {
    // Check if we're on Vercel (no local gateway)
    if (process.env.SUPABASE_DATABASE_URL || process.env.VERCEL) {
      // Derive "connected" from whether we have active/working agents
      const agents = await queryAll<{ id: string; status: string }>('SELECT id, status FROM agents');
      const workingCount = agents.filter(a => a.status === 'working').length;

      return NextResponse.json({
        connected: agents.length > 0,
        sessions_count: workingCount,
        sessions: agents.filter(a => a.status === 'working').map(a => ({
          agent_id: a.id,
          status: 'active',
        })),
        gateway_url: 'supabase-sync',
        mode: 'cloud',
      });
    }

    // Local mode: try real gateway
    const { getOpenClawClient } = await import('@/lib/openclaw/client');
    const client = getOpenClawClient();

    if (!client.isConnected()) {
      try {
        await client.connect();
      } catch {
        return NextResponse.json({
          connected: false,
          error: 'Failed to connect to OpenClaw Gateway',
          gateway_url: process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789',
        });
      }
    }

    try {
      const sessions = await client.listSessions();
      return NextResponse.json({
        connected: true,
        sessions_count: sessions.length,
        sessions,
        gateway_url: process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789',
      });
    } catch {
      return NextResponse.json({
        connected: true,
        error: 'Connected but failed to list sessions',
        gateway_url: process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789',
      });
    }
  } catch (error) {
    console.error('OpenClaw status check failed:', error);
    return NextResponse.json({ connected: false, error: 'Internal server error' }, { status: 500 });
  }
}
