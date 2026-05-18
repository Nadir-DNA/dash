'use client'

import { useState, useEffect } from 'react'
import { GlyphNumber } from './glyph-number'

interface CircularProgressProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  label?: string
  className?: string
}

export function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 3,
  label = "Taux d'atteinte",
  className,
}: CircularProgressProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const radius = size / 2 - strokeWidth * 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? strokeDashoffset : circumference}
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.19, 1, 0.22, 1)',
            filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))',
          }}
        />
      </svg>

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <GlyphNumber value={Math.round(percentage)} size="sm" animate={false} />
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 4 }}>%</div>
        <div style={{
          fontSize: 8,
          color: 'var(--color-text-tertiary)',
          marginTop: 2,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
      </div>
    </div>
  )
}
