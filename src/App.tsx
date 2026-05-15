import { useState, useEffect, useCallback } from 'react'
import {
  fetchMetrics,
  toMetricCards,
  getProjectStatus,
  getProjectAccent,
  getProjectIcon,
  getProjectData,
  type DashData,
  type MetricCard,
} from './lib/metrics'

// ─── Components ────────────────────────────────────────────────────────────────

function ProgressBar({ value, target, accent }: { value: number; target: number; accent?: string }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  const showWarning = pct < 30
  const showGood = pct >= 80

  return (
    <div className="kpi-card-progress">
      <div className="kpi-card-progress-bar">
        <div
          className="kpi-card-progress-fill"
          style={{
            width: `${pct}%`,
            background: accent || `var(--text-secondary)`,
            opacity: showWarning ? 0.3 : 1,
          }}
        />
      </div>
      <div className="kpi-card-progress-label">
        <span>Objectif: {target.toLocaleString('fr-FR')}</span>
        <span className="kpi-card-progress-pct" style={{ color: showGood ? 'var(--success)' : showWarning ? 'var(--warning)' : 'var(--text-secondary)' }}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  )
}

function KpiCard({ card, accent }: { card: MetricCard; accent?: string }) {
  return (
    <div className="kpi-card" style={{ '--accent': accent } as React.CSSProperties}>
      <div className="kpi-card-label">{card.label}</div>
      <div className="kpi-card-value">
        {card.value.toLocaleString('fr-FR')}
        {card.unit && <span className="kpi-card-unit">{card.unit}</span>}
      </div>
      <ProgressBar value={card.value} target={card.target} accent={accent} />
    </div>
  )
}

function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  )
}

function EmptyState({ projectId }: { projectId: string }) {
  const messages: Record<string, { icon: string; title: string; desc: string }> = {
    agentcrm: {
      icon: '🔌',
      title: 'AgentCRM non connecté',
      desc: "Les tables Supabase AgentCRM n'ont pas été trouvées. Vérifiez la configuration.",
    },
    flashcert: {
      icon: '🚧',
      title: 'FlashCert en attente',
      desc: 'Le projet FlashCert sera configuré prochainement.',
    },
  }
  const msg = messages[projectId] || {
    icon: '📭',
    title: 'Aucune donnée',
    desc: 'Pas encore de métriques pour ce projet.',
  }

  return (
    <div className="empty-state">
      <div className="empty-state-icon">{msg.icon}</div>
      <div className="empty-state-title">{msg.title}</div>
      <div className="empty-state-desc">{msg.desc}</div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-state">
      <div className="error-state-icon">⚠️</div>
      <div className="error-state-title">Erreur de chargement</div>
      <div className="error-state-desc">{message}</div>
      <button className="retry-btn" onClick={onRetry}>Réessayer</button>
    </div>
  )
}

function ProjectTab({ id, name, accent, active, onClick, status }: {
  id: string
  name: string
  accent: string
  active: boolean
  onClick: () => void
  status: 'active' | 'empty' | 'error'
}) {
  return (
    <button className={`project-tab ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="project-tab-dot" style={{ background: status === 'active' ? accent : 'var(--text-tertiary)' }} />
      {getProjectIcon(id)} {name}
    </button>
  )
}

function ComparisonView({ data, onSelect }: { data: DashData; onSelect: (id: string) => void }) {
  const projectIds = ['amens', 'agentcrm', 'flashcert']
  const allMetrics: Record<string, MetricCard[]> = {}
  projectIds.forEach(id => {
    allMetrics[id] = toMetricCards(id, getProjectData(data, id))
  })

  return (
    <div className="comparison-table">
      <div className="comparison-row header">
        <div className="comparison-cell">Projet</div>
        <div className="comparison-cell">Statut</div>
        <div className="comparison-cell">Métriques</div>
        <div className="comparison-cell">MRR</div>
      </div>
      {projectIds.map(id => {
        const projectData = getProjectData(data, id)
        const status = getProjectStatus(id, projectData)
        const accent = getProjectAccent(id)
        const cards = allMetrics[id] || []
        const mrr = cards.find(c => c.id.includes('mrr'))
        return (
          <div
            key={id}
            className="comparison-row data"
            onClick={() => onSelect(id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="comparison-cell project-name">
              <span className="project-tab-dot" style={{ background: accent }} />
              {getProjectIcon(id)} {id === 'amens' ? 'Amens' : id === 'agentcrm' ? 'AgentCRM' : id === 'flashcert' ? 'FlashCert' : id}
            </div>
            <div className="comparison-cell">
              <span className={`status-badge ${status === 'active' ? 'active' : status === 'error' ? 'error' : 'warning'}`}>
                {status === 'active' ? '✓ Actif' : status === 'error' ? '✗ Erreur' : '○ En attente'}
              </span>
            </div>
            <div className="comparison-cell" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              {cards.length} métriques
            </div>
            <div className="comparison-cell" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: mrr ? accent : 'var(--text-tertiary)' }}>
              {mrr ? `${mrr.value}€` : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main App ──────────────────────────────────────────────────────────────────

const PROJECTS = [
  { id: 'amens', name: 'Amens' },
  { id: 'agentcrm', name: 'AgentCRM' },
  { id: 'flashcert', name: 'FlashCert' },
]

export default function App() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState('amens')
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchMetrics()
      setData(result)
      setLastFetch(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [load])

  const projectData = data ? getProjectData(data, selectedProject) : null
  const projectStatus = projectData ? getProjectStatus(selectedProject, projectData) : 'empty'
  const accent = getProjectAccent(selectedProject)
  const cards = projectData ? toMetricCards(selectedProject, projectData) : []

  // Determine data freshness
  const getFreshness = () => {
    if (!lastFetch) return { label: 'Chargement...', cls: '' }
    const diffMin = Math.floor((Date.now() - lastFetch.getTime()) / 60000)
    if (diffMin < 2) return { label: 'Live', cls: '' }
    if (diffMin < 30) return { label: `MAJ il y a ${diffMin} min`, cls: '' }
    if (diffMin < 60) return { label: `MAJ il y a ${diffMin} min`, cls: 'stale' }
    return { label: `MAJ il y a ${Math.floor(diffMin / 60)}h`, cls: 'error' }
  }

  const freshness = getFreshness()

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <span className="header-logo-dot" />
          Dash
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: 16 }}>◎</span>
        </div>

        <div className="header-meta">
          {!loading && (
            <div className="header-updated">
              <span className={`header-updated-dot ${freshness.cls}`} />
              {freshness.label}
            </div>
          )}
          <div className="project-tabs">
            {PROJECTS.map(p => (
              <ProjectTab
                key={p.id}
                id={p.id}
                name={p.name}
                accent={getProjectAccent(p.id)}
                active={selectedProject === p.id}
                onClick={() => setSelectedProject(p.id)}
                status={data ? getProjectStatus(p.id, getProjectData(data, p.id)) : 'empty'}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="content">
        {loading && !data && (
          <>
            <div className="section">
              <div className="section-header"><div className="section-title">Métriques</div></div>
              <SkeletonGrid count={6} />
            </div>
          </>
        )}

        {error && !data && <ErrorState message={error} onRetry={load} />}

        {data && (
          <>
            {/* Selected Project View */}
            <div className="section">
              <div className="section-header">
                <div className="section-title">
                  {getProjectIcon(selectedProject)} {PROJECTS.find(p => p.id === selectedProject)?.name} — Métriques
                </div>
                {data.generated_at && (
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    Données du {new Date(data.generated_at).toLocaleString('fr-FR')}
                  </span>
                )}
              </div>

              {projectStatus === 'active' && cards.length > 0 && (
                <div className="kpi-grid">
                  {cards.map((card) => (
                    <KpiCard key={card.id} card={card} accent={accent} />
                  ))}
                </div>
              )}

              {projectStatus === 'active' && cards.length === 0 && (
                <EmptyState projectId={selectedProject} />
              )}

              {projectStatus !== 'active' && <EmptyState projectId={selectedProject} />}
            </div>

            {/* All Projects Comparison */}
            <div className="section">
              <div className="section-header">
                <div className="section-title">Vue d'ensemble</div>
              </div>
              <ComparisonView data={data} onSelect={setSelectedProject} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
