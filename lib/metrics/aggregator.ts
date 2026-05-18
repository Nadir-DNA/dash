/**
 * Aggregator - Collecte et cache des métriques de tous les projets.
 */

import type { AllMetricsResponse, ProjectName, ProjectMetricsPayload } from './types';
import { fetchAmensMetrics, checkAmensHealth } from './connectors/amens';
import { fetchFlashCertMetrics, checkFlashCertHealth } from './connectors/flashcert';
import { fetchDashCrmMetrics, checkDashCrmHealth } from './connectors/crm';
import { fetchSiteVitrineMetrics, checkSiteVitrineHealth } from './connectors/sitevitrine';
import { fetchLeaguePlayMetrics, checkLeaguePlayHealth } from './connectors/leagueplay';

interface Connector {
  name: ProjectName;
  fetchMetrics: () => Promise<ProjectMetricsPayload>;
  checkHealth: () => Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

const connectors: Connector[] = [
  { name: 'amens', fetchMetrics: fetchAmensMetrics, checkHealth: checkAmensHealth },
  { name: 'flashcert', fetchMetrics: fetchFlashCertMetrics, checkHealth: checkFlashCertHealth },
  { name: 'crm', fetchMetrics: fetchDashCrmMetrics, checkHealth: checkDashCrmHealth },
  { name: 'sitevitrine', fetchMetrics: fetchSiteVitrineMetrics, checkHealth: checkSiteVitrineHealth },
  { name: 'leagueplay', fetchMetrics: fetchLeaguePlayMetrics, checkHealth: checkLeaguePlayHealth },
];

// Cache en mémoire (partagé entre les requêtes dans le même worker Next.js)
let cachedMetrics: AllMetricsResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15_000;

export async function getProjectMetrics(project: ProjectName): Promise<ProjectMetricsPayload | null> {
  const connector = connectors.find(c => c.name === project);
  if (!connector) return null;
  return connector.fetchMetrics();
}

export async function getAllMetrics(): Promise<AllMetricsResponse> {
  const now = Date.now();
  if (cachedMetrics && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedMetrics;
  }

  const results = await Promise.allSettled(connectors.map(c => c.fetchMetrics()));

  const projects: ProjectMetricsPayload[] = [];
  let healthyCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      projects.push(result.value);
      const hasError = result.value.metrics.some(m => m.key === 'connection_error');
      if (!hasError) healthyCount++;
    } else {
      console.error('[Aggregator] Failed to fetch metrics:', result.reason);
    }
  }

  const totalMetrics = projects.reduce((sum, p) => sum + p.metrics.length, 0);

  const response: AllMetricsResponse = {
    timestamp: new Date().toISOString(),
    projects,
    summary: { totalMetrics, healthyProjects: healthyCount, totalProjects: connectors.length },
  };

  cachedMetrics = response;
  cacheTimestamp = now;
  return response;
}

export function invalidateCache(): void {
  cachedMetrics = null;
  cacheTimestamp = 0;
}

export async function checkAllHealth(): Promise<Array<{
  project: ProjectName;
  ok: boolean;
  latencyMs: number;
  error?: string;
}>> {
  const results = await Promise.allSettled(
    connectors.map(async c => {
      const health = await c.checkHealth();
      return { project: c.name, ...health };
    })
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      project: connectors[i]!.name,
      ok: false,
      latencyMs: 0,
      error: (r.reason as Error)?.message || 'Unknown error',
    };
  });
}
