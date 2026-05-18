import { NextResponse } from 'next/server';
import { getAllMetrics } from '@/lib/metrics/aggregator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getAllMetrics();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API] /metrics/all error:', message);
    return NextResponse.json(
      { error: 'Failed to aggregate metrics', details: message },
      { status: 500 }
    );
  }
}
