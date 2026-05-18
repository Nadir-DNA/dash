/**
 * Connecteur Amens - Supabase
 * Métriques depuis Supabase Amens (pas encore migré sur TrailBase).
 */

import type { Metric, ProjectMetricsPayload } from '../types';

const AMENS_URL = process.env.AMENS_SUPABASE_URL || 'https://ntsbywucjgusewcgblhz.supabase.co';
const AMENS_KEY = process.env.AMENS_SUPABASE_SERVICE_ROLE_KEY || '';

const BASE = `${AMENS_URL}/rest/v1`;

function headers() {
  return {
    'Authorization': `Bearer ${AMENS_KEY}`,
    'apikey': AMENS_KEY,
    'Content-Type': 'application/json',
  };
}

async function count(table: string, column?: string, value?: string): Promise<number> {
  if (!AMENS_KEY) return 0;
  try {
    let url = `${BASE}/${table}?select=count`;
    if (column && value) {
      const suffix = column === 'created_at' ? `gte.${value}` : `eq.${value}`;
      url += `&${column}=${suffix}`;
    }
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) return 0;
    const data = await res.json();
    return data?.[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

async function fetchAll(table: string): Promise<Record<string, unknown>[]> {
  if (!AMENS_KEY) return [];
  try {
    const res = await fetch(`${BASE}/${table}?select=*&limit=5000`, { headers: headers() });
    if (!res.ok) return [];
    return await res.json() as Record<string, unknown>[];
  } catch {
    return [];
  }
}

function startOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

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

async function getBookingsMetrics(): Promise<Metric[]> {
  const [total, today, week, month] = await Promise.all([
    count('bookings'),
    count('bookings', 'created_at', startOfDay()),
    count('bookings', 'created_at', startOfWeek()),
    count('bookings', 'created_at', startOfMonth()),
  ]);
  return [
    metric('bookings_total', total, 500, 'count', 0, 'Total des rendez-vous'),
    metric('bookings_today', today, 20, 'count', 0, "Rendez-vous aujourd'hui"),
    metric('bookings_this_week', week, 100, 'count', 0, 'Rendez-vous cette semaine'),
    metric('bookings_this_month', month, 300, 'count', 0, 'Rendez-vous ce mois'),
  ];
}

async function getProfessionalsMetrics(): Promise<Metric[]> {
  const active = await count('professionals', 'status', 'active');
  return [metric('professionals_active', active, 50, 'count', 0, 'Professionnels actifs')];
}

async function getReviewsMetrics(): Promise<Metric[]> {
  const records = await fetchAll('reviews');
  const ratings = records.map(r => r.rating).filter((v): v is number => typeof v === 'number');
  const total = ratings.length;
  const avgRating = total > 0
    ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / total) * 10) / 10
    : 0;
  return [
    metric('reviews_total', total, 200, 'count', 0, 'Total des avis'),
    metric('reviews_avg_rating', avgRating, 4.5, '/5', 0, 'Note moyenne'),
  ];
}

async function getUsersMetrics(): Promise<Metric[]> {
  const total = await count('profiles');
  return [metric('users_total', total, 1000, 'count', 0, 'Utilisateurs inscrits')];
}

async function getSubscriptionsMetrics(): Promise<Metric[]> {
  const active = await count('subscriptions', 'status', 'active');
  return [
    metric('subscriptions_active', active, 100, 'count', 0, 'Abonnements actifs'),
    metric('revenue_mrr_estimated', active * 29, 2900, '€', 0, 'MRR estimé (29€/sub)'),
  ];
}

export async function fetchAmensMetrics(): Promise<ProjectMetricsPayload> {
  const timestamp = new Date().toISOString();
  try {
    const results = await Promise.allSettled([
      getBookingsMetrics(),
      getProfessionalsMetrics(),
      getReviewsMetrics(),
      getUsersMetrics(),
      getSubscriptionsMetrics(),
    ]);
    const metrics: Metric[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') metrics.push(...result.value);
      else console.error('[Amens] Metric collection failed:', result.reason);
    }
    return { project: 'amens', timestamp, metrics };
  } catch (err) {
    console.error('[Amens] Fatal error:', err);
    return {
      project: 'amens', timestamp,
      metrics: [metric('connection_error', 0, 1, 'count', 0, 'Erreur de connexion Supabase')],
    };
  }
}

export async function checkAmensHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    if (!AMENS_KEY) return { ok: false, latencyMs: 0, error: 'Clé Supabase Amens manquante' };
    const res = await fetch(`${BASE}/bookings?select=count&limit=1`, { headers: headers() });
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, latencyMs: Date.now() - start, error: msg };
  }
}
