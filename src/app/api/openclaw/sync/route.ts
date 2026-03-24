import { NextResponse } from 'next/server';
import { syncGatewayAgentsToCatalog } from '@/lib/agent-catalog-sync';

export const dynamic = 'force-dynamic';

// POST /api/openclaw/sync - Force a sync of Gateway agents into the local catalog
export async function POST() {
  try {
    const changed = await syncGatewayAgentsToCatalog({ force: true, reason: 'manual-api-sync' });
    return NextResponse.json({ ok: true, changed });
  } catch (error) {
    console.error('Manual OpenClaw sync failed:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'sync failed',
      },
      { status: 500 }
    );
  }
}
