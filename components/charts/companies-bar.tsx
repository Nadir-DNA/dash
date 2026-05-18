'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

type Props = {
  data: { name: string; value: number; leads: number }[]
}

export function CompaniesBarChart({ data }: Props) {
  if (data.length === 0) return (
    <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
      Aucune donnée
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v.length > 14 ? v.slice(0, 13) + '…' : v}
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
            const p = props?.payload as { leads?: number } | undefined
            return [`${v.toLocaleString('fr-FR')} €${p?.leads != null ? ` · ${p.leads} lead${p.leads > 1 ? 's' : ''}` : ''}`, ''] as [string, string]
          }}
          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((_, index) => (
            <Cell key={index} fill="#6366f1" fillOpacity={0.7 + (index / data.length) * 0.3} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
