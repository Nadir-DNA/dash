import { NextResponse } from 'next/server'
import { checkAllHealth } from '@/lib/metrics/aggregator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/metrics/health
 * Returns health status for all connected projects
 */
export async function GET() {
  try {
    const health = await checkAllHealth()
    return NextResponse.json({
      status: health.every(h => h.ok) ? 'ok' : health.some(h => h.ok) ? 'degraded' : 'down',
      timestamp: new Date().toISOString(),
      projects: health.map(h => ({
        project: h.project,
        connected: h.ok,
        latencyMs: h.latencyMs,
        error: h.error,
        lastCheck: new Date().toISOString(),
      })),
    })
  } catch (error) {
    console.error('[API/metrics/health] Error:', error)
    return NextResponse.json(
      { status: 'down', error: (error as Error).message },
      { status: 500 }
    )
  }
}
