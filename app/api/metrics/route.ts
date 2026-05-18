import { NextResponse } from 'next/server'
import { getAllMetrics, invalidateCache } from '@/lib/metrics/aggregator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/metrics
 * Returns all project metrics (from cache or fresh)
 */
export async function GET() {
  try {
    const metrics = await getAllMetrics()
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('[API/metrics] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/metrics
 * Invalidate cache and re-fetch all metrics
 */
export async function POST() {
  try {
    invalidateCache()
    const metrics = await getAllMetrics()
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('[API/metrics] POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh metrics', message: (error as Error).message },
      { status: 500 }
    )
  }
}
