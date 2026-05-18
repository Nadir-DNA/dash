/**
 * Connecteur CRM - Trailbase
 * Métriques depuis les tables CRM dans TrailBase.
 */

import { countRecords, fetchAllRecords } from '../trailbase';
import type { Metric, ProjectMetricsPayload } from '../types';

function startOfWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1);
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

async function getCompaniesMetrics(): Promise<Metric[]> {
  const total = await countRecords('companies');
  return [metric('companies_total', total, 100, 'count', 0, 'Entreprises dans le CRM')];
}

async function getLeadsMetrics(): Promise<Metric[]> {
  const [total, thisWeek, thisMonth] = await Promise.all([
    countRecords('contacts'),
    countRecords('contacts', { column: 'created_at', value: startOfWeek() }),
    countRecords('contacts', { column: 'created_at', value: startOfMonth() }),
  ]);
  return [
    metric('leads_total', total, 5000, 'count', 0, 'Total des leads / contacts'),
    metric('leads_this_week', thisWeek, 200, 'count', 0, 'Leads cette semaine'),
    metric('leads_this_month', thisMonth, 500, 'count', 0, 'Leads ce mois'),
  ];
}

async function getCampaignsMetrics(): Promise<Metric[]> {
  const [total, active] = await Promise.all([
    countRecords('campaigns'),
    countRecords('campaigns', { column: 'status', value: 'active' }),
  ]);
  return [
    metric('campaigns_total', total, 100, 'count', 0, 'Campagnes totales'),
    metric('campaigns_active', active, 10, 'count', 0, 'Campagnes actives'),
  ];
}

async function getSmsMetrics(): Promise<Metric[]> {
  const monthStart = startOfMonth();
  const [total, sendingSent, doneSent, failed] = await Promise.all([
    countRecords('sms_batches', { column: 'created_at', value: monthStart }),
    countRecords('sms_batches', [
      { column: 'created_at', value: monthStart },
      { column: 'status', value: 'sending' },
    ]),
    countRecords('sms_batches', [
      { column: 'created_at', value: monthStart },
      { column: 'status', value: 'done' },
    ]),
    countRecords('sms_batches', [
      { column: 'created_at', value: monthStart },
      { column: 'status', value: 'failed' },
    ]),
  ]);
  const deliveryRate = total > 0
    ? Math.round(((doneSent ?? 0) / total) * 1000) / 10
    : 0;
  return [
    metric('sms_sent_this_month', (sendingSent ?? 0) + (doneSent ?? 0), 1000, 'count', 0, 'SMS envoyés ce mois'),
    metric('sms_delivered_this_month', doneSent ?? 0, 950, 'count', 0, 'SMS délivrés ce mois'),
    metric('sms_failed_this_month', failed ?? 0, 50, 'count', 0, 'SMS échoués ce mois'),
    metric('sms_delivery_rate', deliveryRate, 95.0, '%', 0, 'Taux de délivrance SMS'),
  ];
}

export async function fetchDashCrmMetrics(): Promise<ProjectMetricsPayload> {
  const timestamp = new Date().toISOString();
  try {
    const results = await Promise.allSettled([
      getCompaniesMetrics(),
      getLeadsMetrics(),
      getCampaignsMetrics(),
      getSmsMetrics(),
    ]);
    const metrics: Metric[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') metrics.push(...result.value);
      else console.error('[Dash CRM] Metric collection failed:', result.reason);
    }
    return { project: 'crm', timestamp, metrics };
  } catch (err) {
    console.error('[Dash CRM] Fatal error:', err);
    return {
      project: 'crm', timestamp,
      metrics: [metric('connection_error', 0, 1, 'count', 0, 'Erreur de connexion à Trailbase')],
    };
  }
}

export async function checkDashCrmHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await countRecords('companies');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, latencyMs: Date.now() - start, error: msg };
  }
}
