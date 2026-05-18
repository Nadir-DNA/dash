/**
 * Connecteur SiteVitrine - Trailbase / Supabase
 * Métriques depuis les tables site_vitrine_* dans TrailBase.
 * Dégrade gracieusement si les tables n'existent pas.
 */

import { countRecords } from '../trailbase';
import type { Metric, ProjectMetricsPayload } from '../types';

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function metric(key: string, value: number, target: number, unit: string, change: number, description: string): Metric {
  return { key, value, target, unit, change, description };
}

async function getSitesMetrics(): Promise<Metric[]> {
  const [total, thisMonth] = await Promise.all([
    countRecords('sitevitrine_sites'),
    countRecords('sitevitrine_sites', { column: 'created_at', value: startOfMonth() }),
  ]);
  return [
    metric('sites_total', total, 200, 'count', 0, 'Sites vitrines générés'),
    metric('sites_this_month', thisMonth, 20, 'count', 0, 'Sites créés ce mois'),
  ];
}

async function getDeploymentMetrics(): Promise<Metric[]> {
  const deployed = await countRecords('sitevitrine_sites', { column: 'status', value: 'deployed' });
  return [
    metric('sites_deployed', deployed, 150, 'count', 0, 'Sites déployés'),
  ];
}

export async function fetchSiteVitrineMetrics(): Promise<ProjectMetricsPayload> {
  const timestamp = new Date().toISOString();
  try {
    const [sites, deployments] = await Promise.allSettled([
      getSitesMetrics(),
      getDeploymentMetrics(),
    ]);
    const metrics: Metric[] = [];
    if (sites.status === 'fulfilled') metrics.push(...sites.value);
    else console.error('[SiteVitrine] Sites error:', sites.reason);
    if (deployments.status === 'fulfilled') metrics.push(...deployments.value);
    else console.error('[SiteVitrine] Deployments error:', deployments.reason);

    if (metrics.length === 0) {
      metrics.push(metric('_status', 0, 1, 'count', 0, 'Tables Trailbase non trouvées'));
    }
    return { project: 'sitevitrine', timestamp, metrics };
  } catch (err) {
    console.error('[SiteVitrine] Fatal error:', err);
    return {
      project: 'sitevitrine', timestamp,
      metrics: [metric('connection_error', 0, 1, 'count', 0, 'Erreur de connexion')],
    };
  }
}

export async function checkSiteVitrineHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await countRecords('sitevitrine_sites');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, latencyMs: Date.now() - start, error: msg };
  }
}
