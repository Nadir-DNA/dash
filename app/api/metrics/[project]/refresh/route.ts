import { NextResponse } from 'next/server';
import type { ProjectName } from '@/lib/metrics/types';
import { getProjectMetrics, invalidateCache } from '@/lib/metrics/aggregator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PROJECTS: ProjectName[] = ['amens', 'flashcert', 'crm', 'sitevitrine', 'leagueplay'];

function isValidProject(name: string): name is ProjectName {
  return VALID_PROJECTS.includes(name as ProjectName);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ project: string }> }
) {
  const { project } = await params;

  if (!isValidProject(project)) {
    return NextResponse.json(
      { error: `Invalid project: "${project}". Valid: ${VALID_PROJECTS.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    invalidateCache();
    const data = await getProjectMetrics(project);
    if (!data) {
      return NextResponse.json({ error: `Project "${project}" not found` }, { status: 404 });
    }
    return NextResponse.json({ ...data, _cache: 'invalidated' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[API] /metrics/${project}/refresh error:`, message);
    return NextResponse.json(
      { error: `Failed to refresh metrics for ${project}`, details: message },
      { status: 500 }
    );
  }
}
