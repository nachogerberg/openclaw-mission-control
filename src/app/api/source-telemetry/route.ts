import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await queryAll<{
      id: string;
      source_name: string;
      status: 'online' | 'degraded' | 'offline';
      last_ping: string;
      record_count: number;
    }>('SELECT * FROM source_telemetry ORDER BY source_name ASC');

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to load source telemetry:', error);
    return NextResponse.json({ error: 'Failed to load source telemetry' }, { status: 500 });
  }
}
