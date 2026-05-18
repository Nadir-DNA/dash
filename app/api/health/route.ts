import { NextResponse } from 'next/server';
import type { HealthResponse, ProjectHealth } from '@/lib/metrics/types';
import { checkAllHealth } from '@/lib/metrics/aggregator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = process.uptime();
  try {
    const healthResults = await checkAllHealth();

    const projects: ProjectHealth[] = healthResults.map(h => ({
      project: h.project,
      connected: h.ok,
      latencyMs: h.latencyMs,
      error: h.error,
      lastCheck: new Date().toISOString(),
    }));

    const healthyCount = projects.filter(p => p.connected).length;
    const totalCount = projects.length;

    let status: 'ok' | 'degraded' | 'down';
    if (healthyCount === totalCount) status = 'ok';
    else if (healthyCount > 0) status = 'degraded';
    else status = 'down';

    const response: HealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: Math.round(startTime),
      projects,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        status: 'down',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: Math.round(startTime),
        error: message,
        projects: [],
      },
      { status: 500 }
    );
  }
}
