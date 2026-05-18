'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type Props = {
  data: { label: string; count: number; value: number }[]
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#10b981', '#ef4444']

export function CompanyPipelineChart({ data }: Props) {
  const hasData = data.some(d => d.count > 0)
  if (!hasData) return (
    <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
      Aucune donnée
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={24}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))' }}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: 12,
          }}
          formatter={(value, _name, props) => {
            const v = Number(value)
            const p = props?.payload as { value?: number } | undefined
            return [`${v} lead${v > 1 ? 's' : ''}${p?.value ? ` · ${p.value.toLocaleString('fr-FR')} €` : ''}`, ''] as [string, string]
          }}
          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
