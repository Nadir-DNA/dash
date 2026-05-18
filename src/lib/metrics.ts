// Metrics data fetcher — direct Supabase + TrailBase queries
// No cron, no Storage, no metrics.json. Browser queries live data.

import { supabase } from './supabaseClient'
import { TRAILBASE_CONFIGURED, tbCount, tbList } from './trailbaseClient'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectId = 'amens' | 'sitevitrine' | 'flashcert'

export interface AmensMetrics {
  professionals: number
  profiles: number
  subscriptions_active: number
  bookings_total: number
  reviews_total: number
  mrr: number
}

export interface SitevitrineMetrics {
  visits: number
  contacts: number
  leads: number
}

export type ProjectMetrics = AmensMetrics | SitevitrineMetrics | Record<string, never>

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

// ─── Amens schema constants ───────────────────────────────────────────────────

const AMENS_TABLES = {
  professionals: 'professionals',
  profiles: 'profiles',
  subscriptions: 'subscriptions',
  bookings: 'bookings',
  reviews: 'reviews',
} as const

const AMENS_FALLBACK_AMOUNT = 29

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
  const [profRes, profilesRes, subsActiveRes, bookingsRes, reviewsRes, subsDataRes] = await Promise.allSettled([
    supabase.from(AMENS_TABLES.professionals).select('*', { count: 'exact', head: true }),
    supabase.from(AMENS_TABLES.profiles).select('*', { count: 'exact', head: true }),
    supabase.from(AMENS_TABLES.subscriptions).select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from(AMENS_TABLES.bookings).select('*', { count: 'exact', head: true }),
    supabase.from(AMENS_TABLES.reviews).select('*', { count: 'exact', head: true }),
    supabase.from(AMENS_TABLES.subscriptions).select('amount').eq('status', 'active'),
  ])

  const get = <T>(r: PromiseSettledResult<T>) => (r.status === 'fulfilled' ? r.value : null)

  const profCount     = get(profRes)
  const profilesCount = get(profilesRes)
  const subsActive    = get(subsActiveRes)
  const bookings      = get(bookingsRes)
  const reviews       = get(reviewsRes)
  const subsData      = get(subsDataRes)

  const successCount = [profCount, profilesCount, subsActive, bookings, reviews, subsData].filter(Boolean).length
  if (successCount === 0) {
    return { status: 'error', error: 'Toutes les requêtes Supabase ont échoué' }
  }

  const mrr = (subsData?.data ?? []).reduce((s, r) => s + (Number(r.amount) || AMENS_FALLBACK_AMOUNT), 0)

  const metrics: AmensMetrics = {
    professionals:        profCount?.count        ?? -1,
    profiles:             profilesCount?.count    ?? -1,
    subscriptions_active: subsActive?.count       ?? -1,
    bookings_total:       bookings?.count         ?? -1,
    reviews_total:        reviews?.count          ?? -1,
    mrr:                  subsData ? mrr : -1,
  }

  return { status: 'ok', generated_at: new Date().toISOString(), metrics }
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
      const rows = await tbList<Record<string, unknown>>(src.table, src.filter ? { filter: src.filter } : {})
      return rows.reduce((s, r) => s + (Number(r[src.field]) || 0), 0)
    }),
  )
  const metrics: Partial<SitevitrineMetrics> = {}
  let successes = 0
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const key = entries[i][0] as keyof SitevitrineMetrics
      metrics[key] = r.value
      successes++
    }
  })
  if (successes === 0) {
    return { status: 'error', error: 'Aucune table TrailBase accessible' }
  }
  return { status: 'ok', metrics: metrics as SitevitrineMetrics, generated_at: new Date().toISOString() }
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
  const dataMap = data as Record<string, number>
  return defs
    .filter(d => dataMap[d.key] !== undefined && dataMap[d.key] !== -1)
    .map(d => ({
      id: `${projectId}-${d.key}`,
      label: d.label,
      value: typeof dataMap[d.key] === 'number' ? dataMap[d.key] : 0,
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
