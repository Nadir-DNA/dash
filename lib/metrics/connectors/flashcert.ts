/**
 * Connecteur FlashCert - Trailbase
 * Métriques depuis les tables flashcert_* dans Trailbase.
 * Dégrade gracieusement si les tables n'existent pas.
 */

import { countRecords, fetchAllRecords } from '../trailbase';
import type { Metric, ProjectMetricsPayload } from '../types';

function startOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function metric(key: string, value: number, target: number, unit: string, change: number, description: string): Metric {
  return { key, value, target, unit, change, description };
}

function getPlaceholderMetrics(): Metric[] {
  return [
    metric('users_total', 0, 500, 'count', 0, 'Utilisateurs inscrits (non configuré)'),
    metric('users_this_month', 0, 100, 'count', 0, 'Nouveaux utilisateurs ce mois'),
    metric('conversions_total', 0, 50, 'count', 0, 'Conversions totales'),
    metric('conversions_rate', 0, 5.0, '%', 0, 'Taux de conversion'),
    metric('cpf_submissions', 0, 30, 'count', 0, 'Soumissions CPF'),
    metric('cpf_approved', 0, 20, 'count', 0, 'CPF approuvés'),
    metric('page_views_today', 0, 200, 'count', 0, "Visites aujourd'hui"),
  ];
}

async function getUsersMetrics(): Promise<Metric[]> {
  const [total, thisMonth] = await Promise.all([
    countRecords('flashcert_users'),
    countRecords('flashcert_users', { column: 'created_at', value: startOfMonth() }),
  ]);
  return [
    metric('users_total', total, 500, 'count', 0, 'Utilisateurs inscrits'),
    metric('users_this_month', thisMonth, 100, 'count', 0, 'Nouveaux utilisateurs ce mois'),
  ];
}

async function getConversionMetrics(): Promise<Metric[]> {
  const [users, conversions] = await Promise.all([
    fetchAllRecords('flashcert_users'),
    fetchAllRecords('flashcert_conversions'),
  ]);
  const rate = users.length > 0
    ? Math.round((conversions.length / users.length) * 1000) / 10
    : 0;
  return [
    metric('conversions_total', conversions.length, 50, 'count', 0, 'Conversions totales'),
    metric('conversions_rate', rate, 5.0, '%', 0, 'Taux de conversion'),
  ];
}

async function getCpfMetrics(): Promise<Metric[]> {
  const [submissions, approved] = await Promise.all([
    countRecords('flashcert_cpf_submissions'),
    countRecords('flashcert_cpf_submissions', { column: 'status', value: 'approved' }),
  ]);
  return [
    metric('cpf_submissions', submissions, 30, 'count', 0, 'Soumissions CPF'),
    metric('cpf_approved', approved, 20, 'count', 0, 'CPF approuvés'),
  ];
}

async function getPageViewMetrics(): Promise<Metric[]> {
  const views = await countRecords('flashcert_page_views', { column: 'created_at', value: startOfDay() });
  return [metric('page_views_today', views, 200, 'count', 0, "Visites aujourd'hui")];
}

export async function fetchFlashCertMetrics(): Promise<ProjectMetricsPayload> {
  const timestamp = new Date().toISOString();
  try {
    const results = await Promise.allSettled([
      getUsersMetrics(),
      getConversionMetrics(),
      getCpfMetrics(),
      getPageViewMetrics(),
    ]);
    const metrics: Metric[] = [];
    let anyFailed = false;
    for (const result of results) {
      if (result.status === 'fulfilled') metrics.push(...result.value);
      else {
        anyFailed = true;
        console.error('[FlashCert] Metric collection failed:', result.reason);
      }
    }
    if (anyFailed && metrics.length === 0) {
      return {
        project: 'flashcert', timestamp,
        metrics: [
          ...getPlaceholderMetrics(),
          metric('_status', 0, 1, 'count', 0, 'Tables Trailbase non trouvées - données placeholder'),
        ],
      };
    }
    return { project: 'flashcert', timestamp, metrics };
  } catch (err) {
    console.error('[FlashCert] Fatal error:', err);
    return {
      project: 'flashcert', timestamp,
      metrics: [metric('connection_error', 0, 1, 'count', 0, 'Erreur de connexion à Trailbase')],
    };
  }
}

export async function checkFlashCertHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await countRecords('flashcert_users');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, latencyMs: Date.now() - start, error: msg };
  }
}
