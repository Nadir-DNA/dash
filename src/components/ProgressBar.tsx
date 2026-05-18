export function ProgressBar({ value, target, accent }: { value: number; target: number; accent?: string }) {
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
        <span
          className="kpi-card-progress-pct"
          style={{ color: showGood ? 'var(--success)' : showWarning ? 'var(--warning)' : 'var(--text-secondary)' }}
        >
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  )
}
