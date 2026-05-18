import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchAmens,
  fetchSitevitrine,
  fetchFlashcert,
  toMetricCards,
  getProjectStatus,
  getProjectAccent,
  type ProjectId,
  type ProjectFetchResult,
} from './lib/metrics'
import { FLASHCERT_ENABLED } from './lib/trailbaseClient'
import { getFreshness } from './lib/freshness'
import { KpiCard } from './components/KpiCard'
import { SkeletonGrid } from './components/SkeletonGrid'
import { EmptyState } from './components/EmptyState'
import { ErrorState } from './components/ErrorState'
import { ProjectTab } from './components/ProjectTab'
import { ComparisonView } from './components/ComparisonView'

// ─── Project registry ──────────────────────────────────────────────────────────

const ALL_PROJECTS: Array<{ id: ProjectId; name: string }> = [
  { id: 'amens',       name: 'Amens' },
  { id: 'sitevitrine', name: 'Sitevitrine' },
  { id: 'flashcert',   name: 'FlashCert' },
]
const PROJECTS = ALL_PROJECTS.filter(p => p.id !== 'flashcert' || FLASHCERT_ENABLED)

const FETCHERS: Record<ProjectId, () => Promise<ProjectFetchResult>> = {
  amens: fetchAmens,
  sitevitrine: fetchSitevitrine,
  flashcert: fetchFlashcert,
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [results, setResults] = useState<Record<string, ProjectFetchResult | undefined>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [selectedProject, setSelectedProject] = useState<ProjectId>('amens')
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const consecutiveErrors = useRef(0)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadAll = useCallback(async (): Promise<number> => {
    const ids = PROJECTS.map(p => p.id)
    setLoading(Object.fromEntries(ids.map(id => [id, true])))
    const settled = await Promise.allSettled(ids.map(id => FETCHERS[id]()))
    const next: Record<string, ProjectFetchResult> = {}
    let anyError = false
    ids.forEach((id, i) => {
      const res = settled[i].status === 'fulfilled' ? settled[i].value : { status: 'error' as const, error: 'Échec' }
      next[id] = res
      if (res.status === 'error') anyError = true
    })
    setResults(next)
    setLoading(Object.fromEntries(ids.map(id => [id, false])))
    setLastFetch(new Date())
    consecutiveErrors.current = anyError ? consecutiveErrors.current + 1 : 0
    return consecutiveErrors.current
  }, [])

  const scheduleNext = useCallback((errorCount: number) => {
    const DELAYS = [60, 120, 300, 600] // seconds
    const delay = (DELAYS[Math.min(errorCount, DELAYS.length - 1)] ?? 600) * 1000
    refreshTimer.current = setTimeout(async () => {
      const next = await loadAll()
      scheduleNext(next)
    }, delay)
  }, [loadAll])

  const fetchProject = useCallback(async (projectId: ProjectId) => {
    setLoading(prev => ({ ...prev, [projectId]: true }))
    try {
      const result = await FETCHERS[projectId]()
      setResults(prev => ({ ...prev, [projectId]: result }))
      if (result.status !== 'error') consecutiveErrors.current = 0
    } finally {
      setLoading(prev => ({ ...prev, [projectId]: false }))
    }
  }, [])

  useEffect(() => {
    loadAll().then(errors => scheduleNext(errors))
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [loadAll, scheduleNext])

  const currentResult = results[selectedProject]
  const projectStatus = currentResult
    ? getProjectStatus(selectedProject, currentResult.metrics, currentResult.status)
    : 'empty'
  const accent = getProjectAccent(selectedProject)
  const cards = currentResult?.metrics ? toMetricCards(selectedProject, currentResult.metrics) : []
  const anyLoading = Object.values(loading).some(Boolean)
  const freshness = getFreshness(lastFetch)

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <span className="header-logo-dot" />
          Dash
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: 16 }}>◎</span>
        </div>

        <div className="header-meta">
          {!anyLoading && (
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
                status={results[p.id] ? getProjectStatus(p.id, results[p.id]!.metrics, results[p.id]!.status) : 'empty'}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="content">
        {anyLoading && !results.amens && (
          <div className="section">
            <div className="section-header"><div className="section-title">Métriques</div></div>
            <SkeletonGrid count={6} />
          </div>
        )}

        {currentResult?.status === 'error' && !loading[selectedProject] && (
          <ErrorState
            message={currentResult.error || 'Erreur inconnue'}
            onRetry={() => fetchProject(selectedProject)}
          />
        )}

        {currentResult && currentResult.status !== 'error' && (
          <>
            <div className="section">
              <div className="section-header">
                <div className="section-title">
                  {PROJECTS.find(p => p.id === selectedProject)?.name} — Métriques
                </div>
                {currentResult.generated_at && (
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    Données du {new Date(currentResult.generated_at).toLocaleString('fr-FR')}
                  </span>
                )}
              </div>

              {projectStatus === 'active' && cards.length > 0 && (
                <div className="kpi-grid">
                  {cards.map(card => (
                    <KpiCard key={card.id} card={card} accent={accent} />
                  ))}
                </div>
              )}

              {(projectStatus === 'active' && cards.length === 0) ||
               (projectStatus === 'empty' && currentResult.status === 'not_configured') ? (
                <EmptyState projectId={selectedProject} />
              ) : null}
            </div>

            <div className="section">
              <div className="section-header">
                <div className="section-title">Vue d'ensemble</div>
              </div>
              <ComparisonView
                projectIds={PROJECTS.map(p => p.id)}
                results={results}
                onSelect={id => setSelectedProject(id as ProjectId)}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
