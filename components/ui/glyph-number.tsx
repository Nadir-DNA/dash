'use client'

import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════
   GLYPH DIGIT PATTERNS (3×5 dot matrix per character)
   ═══════════════════════════════════════════════════════ */

const GLYPH_DIGITS: Record<string, number[][]> = {
  '0': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
  '2': [[1,1,0],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
  '3': [[1,1,0],[0,0,1],[1,1,0],[0,0,1],[1,1,0]],
  '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
  '5': [[1,1,1],[1,0,0],[1,1,0],[0,0,1],[1,1,0]],
  '6': [[0,1,1],[1,0,0],[1,1,1],[1,0,1],[0,1,0]],
  '7': [[1,1,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0]],
  '8': [[0,1,0],[1,0,1],[0,1,0],[1,0,1],[0,1,0]],
  '9': [[0,1,0],[1,0,1],[0,1,1],[0,0,1],[0,1,0]],
  '.': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,1,0]],
  ',': [[0,0,0],[0,0,0],[0,0,0],[0,1,0],[1,0,0]],
  '%': [[1,0,1],[0,0,1],[0,1,0],[1,0,0],[1,0,1]],
  '€': [[0,1,1],[1,0,0],[1,1,0],[1,0,0],[0,1,1]],
  ' ': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
  '-': [[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
  '+': [[0,0,0],[0,1,0],[1,1,1],[0,1,0],[0,0,0]],
}

const SIZES = {
  sm: { w: 3, h: 3 },
  md: { w: 5, h: 5 },
  lg: { w: 6, h: 6 },
} as const

export function GlyphDigit({
  digit,
  size = 'md',
  className,
}: {
  digit: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const pattern = GLYPH_DIGITS[digit] ?? GLYPH_DIGITS['0']
  const s = SIZES[size]

  return (
    <div className={cn('glyph-digit', `glyph-digit-${size}`, className)}>
      {pattern.map((row, i) =>
        row.map((cell, j) => (
          <span
            key={`${i}-${j}`}
            className={cn('glyph-dot', cell && 'active')}
            style={{ width: s.w, height: s.h }}
          />
        ))
      )}
    </div>
  )
}

export function GlyphNumber({
  value,
  size = 'lg',
  animate = true,
  className,
}: {
  value: number | string
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
  className?: string
}) {
  const formatted = typeof value === 'number' ? value.toLocaleString('fr-FR') : String(value)
  const digits = formatted.split('')

  return (
    <span className={cn('glyph-number', animate && 'animate-count-up', className)}>
      {digits.map((d, i) => (
        <GlyphDigit key={i} digit={d} size={size} />
      ))}
    </span>
  )
}
