'use client'

import { cn } from '@/lib/utils'
import { GlyphNumber } from './glyph-number'
import { CircularProgress } from './circular-progress'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: number
  unit?: string
  target?: number
  change?: number
  description?: string
  className?: string
  showProgress?: boolean
  showCircular?: boolean
}

export function KpiCard({
  label,
  value,
  unit = '',
  target,
  change,
  description,
  className,
  showProgress = true,
  showCircular = true,
}: KpiCardProps) {
  const percentage = target ? (value / target) * 100 : 100
  const isPositive = change !== undefined && change >= 0

  return (
    <div className={cn('kpi-card', className)}>
      {/* Header */}
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        {change !== undefined && (
          <span className={cn('kpi-badge', isPositive ? 'kpi-badge-positive' : 'kpi-badge-negative')}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Value */}
      <div className="kpi-value">
        <GlyphNumber value={value} />
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>

      {/* Description */}
      {description && <div className="kpi-description">{description}</div>}

      {/* Target */}
      {target && (
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
          Objectif: {target.toLocaleString('fr-FR')}{unit ? ` ${unit}` : ''}
        </div>
      )}

      {/* Progress bar */}
      {showProgress && target && (
        <div className="kpi-progress">
          <div
            className="kpi-progress-fill"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}

      {/* Circular progress */}
      {showCircular && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress
            value={value}
            max={Math.max(value, target ?? 100)}
            size={100}
          />
        </div>
      )}
    </div>
  )
}
