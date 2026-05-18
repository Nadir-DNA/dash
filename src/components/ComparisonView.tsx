import {
  getProjectStatus,
  getProjectAccent,
  getProjectIcon,
  toMetricCards,
  type ProjectId,
  type ProjectFetchResult,
} from '../lib/metrics'

const PROJECT_LABELS: Record<string, string> = {
  amens: 'Amens',
  sitevitrine: 'Sitevitrine',
  flashcert: 'FlashCert',
}

export function ComparisonView({
  projectIds,
  results,
  onSelect,
}: {
  projectIds: ProjectId[]
  results: Record<string, ProjectFetchResult | undefined>
  onSelect: (id: string) => void
}) {
  return (
    <div className="comparison-table">
      <div className="comparison-row header">
        <div className="comparison-cell">Projet</div>
        <div className="comparison-cell">Statut</div>
        <div className="comparison-cell" style={{ textAlign: 'left', paddingLeft: 8 }}>Métriques</div>
        <div className="comparison-cell">MRR</div>
      </div>
      {projectIds.map(id => {
        const result = results[id]
        const status = result ? getProjectStatus(id, result.metrics, result.status) : 'empty'
        const accent = getProjectAccent(id)
        const cards = result?.metrics ? toMetricCards(id, result.metrics) : []
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
              {getProjectIcon(id)} {PROJECT_LABELS[id] ?? id}
            </div>
            <div className="comparison-cell">
              <span className={`status-badge ${status === 'active' ? 'active' : status === 'error' ? 'error' : 'warning'}`}>
                {status === 'active' ? '✓ Actif' : status === 'error' ? '✗ Erreur' : '○ En attente'}
              </span>
            </div>
            <div className="comparison-cell" style={{ color: 'var(--text-secondary)', fontSize: 12, textAlign: 'left', paddingLeft: 8 }}>
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
