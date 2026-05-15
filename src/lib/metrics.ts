// Metrics data fetcher — direct Supabase + TrailBase queries
// No cron, no Storage, no metrics.json. Browser queries live data.

import { supabase } from './supabaseClient'
import { TRAILBASE_CONFIGURED, tbCount, tbList } from './trailbaseClient'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectId = 'amens' | 'sitevitrine' | 'flashcert'

export interface ProjectMetrics {
  [key: string]: number | string | undefined
}

export interface ProjectFetchResult {
  status: 'ok' | 'error' | 'not_configured' | 'empty'
  metrics?: ProjectMetrics
  error?: string
  generated_at?: string
}

export interface MetricCard {
  id: string
  label: string
  value: number
  unit: string
  target: number
  description: string
  projectId: string
}

// ─── Metric Definitions ───────────────────────────────────────────────────────

const METRIC_DEFS: Record<
  string,
  Array<{
    key: string
    label: string
    unit: string
    target: number
    description: string
  }>
> = {
  amens: [
    { key: 'professionals', label: 'Professionnels', unit: '', target: 50, description: 'Professionnels actifs sur la plateforme' },
    { key: 'bookings_total', label: 'Rendez-vous', unit: '', target: 1000, description: 'Total des rendez-vous' },
    { key: 'subscriptions_active', label: 'Abonnés', unit: '', target: 100, description: 'Abonnements actifs' },
    { key: 'profiles', label: 'Utilisateurs', unit: '', target: 500, description: 'Utilisateurs inscrits' },
    { key: 'mrr', label: 'MRR', unit: '€', target: 1000, description: 'Revenu mensuel récurrent' },
    { key: 'reviews_total', label: 'Avis', unit: '', target: 200, description: 'Total des avis clients' },
  ],
  sitevitrine: [
    { key: 'visits', label: 'Visites', unit: '', target: 5000, description: 'Visites totales' },
    { key: 'contacts', label: 'Contacts', unit: '', target: 100, description: 'Formulaires reçus' },
    { key: 'leads', label: 'Leads', unit: '', target: 50, description: 'Leads qualifiés' },
  ],
  flashcert: [
    { key: 'users', label: 'Utilisateurs', unit: '', target: 1000, description: 'Utilisateurs inscrits' },
    { key: 'conversions', label: 'Conversions', unit: '', target: 200, description: 'Conversions totales' },
    { key: 'cpf_submissions', label: 'Dossiers CPF', unit: '', target: 500, description: 'Dossiers CPF soumis' },
  ],
}

// ─── TrailBase sources mapping (Sitevitrine) ──────────────────────────────────

type TbMetricSource =
  | { kind: 'count'; table: string; filter?: string }
  | { kind: 'sum'; table: string; field: string; filter?: string }

const SITEVITRINE_SOURCES: Record<string, TbMetricSource> = {
  visits:   { kind: 'count', table: 'visits' },
  contacts: { kind: 'count', table: 'contacts' },
  leads:    { kind: 'count', table: 'leads' },
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchAmens(): Promise<ProjectFetchResult> {
  if (!supabase) {
    return { status: 'not_configured', error: 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes' }
  }
  try {
    const [profCount, profilesCount, subsActive, bookings, reviews, subsData] = await Promise.all([
      supabase.from('professionals').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('amount').eq('status', 'active'),
    ])
    const mrr = (subsData.data ?? []).reduce((s, r) => s + (Number(r.amount) || 29), 0)
    return {
      status: 'ok',
      generated_at: new Date().toISOString(),
      metrics: {
        professionals: profCount.count ?? 0,
        profiles: profilesCount.count ?? 0,
        subscriptions_active: subsActive.count ?? 0,
        bookings_total: bookings.count ?? 0,
        reviews_total: reviews.count ?? 0,
        mrr,
      },
    }
  } catch (e) {
    return { status: 'error', error: e instanceof Error ? e.message : String(e) }
  }
}

export async function fetchSitevitrine(): Promise<ProjectFetchResult> {
  if (!TRAILBASE_CONFIGURED) {
    return { status: 'not_configured', error: 'VITE_TRAILBASE_URL manquante' }
  }
  const entries = Object.entries(SITEVITRINE_SOURCES)
  const results = await Promise.allSettled(
    entries.map(async ([, src]) => {
      if (src.kind === 'count') {
        return tbCount(src.table, src.filter)
      }
      // sum
      const rows = await tbList<Record<string, unknown>>(src.table, src.filter ? { filter: src.filter } : {})
      return rows.reduce((s, r) => s + (Number(r[src.field]) || 0), 0)
    }),
  )
  const metrics: ProjectMetrics = {}
  let successes = 0
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      metrics[entries[i][0]] = r.value
      successes++
    }
  })
  if (successes === 0) {
    return { status: 'error', error: 'Aucune table TrailBase accessible' }
  }
  return { status: 'ok', metrics, generated_at: new Date().toISOString() }
}

export async function fetchFlashcert(): Promise<ProjectFetchResult> {
  return { status: 'not_configured', error: 'FlashCert pas encore connecté' }
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

export function getProjectStatus(
  _projectId: string,
  metrics: ProjectMetrics | undefined,
  fetchStatus?: ProjectFetchResult['status'],
): 'active' | 'empty' | 'error' {
  if (fetchStatus === 'error') return 'error'
  if (fetchStatus === 'not_configured') return 'empty'
  if (!metrics || Object.keys(metrics).length === 0) return 'empty'
  return 'active'
}

export function getProjectAccent(projectId: string): string {
  const colors: Record<string, string> = {
    amens: '#2dd4a8',
    sitevitrine: '#8b5cf6',
    flashcert: '#f59e0b',
  }
  return colors[projectId] || '#6b7280'
}

export function getProjectIcon(projectId: string): string {
  const icons: Record<string, string> = {
    amens: '🧘',
    sitevitrine: '🌐',
    flashcert: '🎓',
  }
  return icons[projectId] || '📊'
}

export function toMetricCards(projectId: string, data: ProjectMetrics): MetricCard[] {
  const defs = METRIC_DEFS[projectId] || []
  return defs
    .filter(d => data[d.key] !== undefined && data[d.key] !== -1)
    .map(d => ({
      id: `${projectId}-${d.key}`,
      label: d.label,
      value: typeof data[d.key] === 'number' ? (data[d.key] as number) : 0,
      unit: d.unit,
      target: d.target,
      description: d.description,
      projectId,
    }))
}

// Helper to safely access project metrics
export function getProjectData(
  results: Record<string, ProjectFetchResult | undefined>,
  projectId: string,
): ProjectMetrics | undefined {
  return results[projectId]?.metrics
}
