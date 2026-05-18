import { NextResponse } from 'next/server'
import { getProjectMetrics, invalidateCache } from '@/lib/metrics/aggregator'
import type { ProjectName } from '@/lib/metrics/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_PROJECTS: ProjectName[] = ['amens', 'flashcert', 'crm', 'sitevitrine', 'leagueplay']

/**
 * GET /api/metrics/[project]/refresh
 * Refresh and return metrics for a specific project.
 * Invalidate the cache first so fresh data is fetched.
 *
 * Example: GET /api/metrics/crm/refresh
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ project: string }> }
) {
  const { project } = await params

  if (!VALID_PROJECTS.includes(project as ProjectName)) {
    return NextResponse.json(
      {
        error: 'Invalid project',
        validProjects: VALID_PROJECTS,
        received: project,
      },
      { status: 400 }
    )
  }

  try {
    // Invalidate cache so we get fresh data
    invalidateCache()

    const metrics = await getProjectMetrics(project as ProjectName)
    if (!metrics) {
      return NextResponse.json(
        { error: 'Project metrics not available' },
        { status: 404 }
      )
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error(`[API/metrics/${project}/refresh] Error:`, error)
    return NextResponse.json(
      { error: 'Failed to refresh metrics', message: (error as Error).message },
      { status: 500 }
    )
  }
}
