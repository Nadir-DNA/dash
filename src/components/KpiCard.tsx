import { ProgressBar } from './ProgressBar'
import type { MetricCard } from '../lib/metrics'

export function KpiCard({ card, accent }: { card: MetricCard; accent?: string }) {
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
