// Metrics data fetcher — reads from Supabase Storage public bucket

const METRICS_URL = 'https://ntsbywucjgusewcgblhz.supabase.co/storage/v1/object/public/dash/metrics.json'

export interface ProjectMetrics {
  [key: string]: number | string | undefined
}

export interface DashData {
  generated_at: string
  projects: {
    amens: ProjectMetrics
    agentcrm: ProjectMetrics
    flashcert: ProjectMetrics
  }
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

// Metric definitions per project
const METRIC_DEFS: Record<string, Array<{
  key: string
  label: string
  unit: string
  target: number
  description: string
}>> = {
  amens: [
    { key: 'professionals', label: 'Professionnels', unit: '', target: 50, description: 'Professionnels actifs sur la plateforme' },
    { key: 'bookings_total', label: 'Rendez-vous', unit: '', target: 1000, description: 'Total des rendez-vous' },
    { key: 'subscriptions_active', label: 'Abonnés', unit: '', target: 100, description: 'Abonnements actifs' },
    { key: 'profiles', label: 'Utilisateurs', unit: '', target: 500, description: 'Utilisateurs inscrits' },
    { key: 'mrr', label: 'MRR', unit: '€', target: 1000, description: 'Revenu mensuel récurrent' },
    { key: 'reviews_total', label: 'Avis', unit: '', target: 200, description: 'Total des avis clients' },
  ],
  agentcrm: [
    { key: 'prospects', label: 'Leads', unit: '', target: 500, description: 'Total des prospects' },
    { key: 'companies', label: 'Entreprises', unit: '', target: 100, description: 'Entreprises enregistrées' },
    { key: 'sms_total', label: 'SMS envoyés', unit: '', target: 10000, description: 'SMS envoyés (30 jours)' },
  ],
  flashcert: [
    { key: 'users', label: 'Utilisateurs', unit: '', target: 1000, description: 'Utilisateurs inscrits' },
    { key: 'conversions', label: 'Conversions', unit: '', target: 200, description: 'Conversions totales' },
    { key: 'cpf_submissions', label: 'Dossiers CPF', unit: '', target: 500, description: 'Dossiers CPF soumis' },
  ],
}

// Status helpers
export function getProjectStatus(_projectId: string, metrics: ProjectMetrics): 'active' | 'empty' | 'error' {
  if (metrics.status === 'no_tables_found') return 'error'
  if (metrics.status === 'not_configured') return 'empty'
  if (Object.keys(metrics).length <= 1 || (Object.keys(metrics).length === 1 && 'status' in metrics)) return 'empty'
  return 'active'
}

export function getProjectAccent(projectId: string): string {
  const colors: Record<string, string> = {
    amens: '#2dd4a8',
    flashcert: '#f59e0b',
    agentcrm: '#8b5cf6',
  }
  return colors[projectId] || '#6b7280'
}

export function getProjectIcon(projectId: string): string {
  const icons: Record<string, string> = {
    amens: '🧘',
    flashcert: '🎓',
    agentcrm: '👥',
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
      value: typeof data[d.key] === 'number' ? data[d.key] as number : 0,
      unit: d.unit,
      target: d.target,
      description: d.description,
      projectId,
    }))
}

export async function fetchMetrics(): Promise<DashData> {
  const res = await fetch(METRICS_URL, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Helper to safely access project metrics
export function getProjectData(data: DashData, projectId: string): ProjectMetrics {
  const projects = data.projects as Record<string, ProjectMetrics>
  return projects[projectId] || {}
}
