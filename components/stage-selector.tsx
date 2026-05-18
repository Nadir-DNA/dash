'use client'

import { useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateContactStage } from '@/app/actions/contacts'
import type { Enums } from '@/types/database'
import { cn } from '@/lib/utils'

const STAGES: { value: Enums<'contact_stage'>; label: string; color: string }[] = [
  { value: 'new', label: 'Nouveau', color: 'border-zinc-600 bg-zinc-800 text-zinc-300' },
  { value: 'contacted', label: 'Contacté', color: 'border-blue-700 bg-blue-950 text-blue-300' },
  { value: 'qualified', label: 'Qualifié', color: 'border-indigo-700 bg-indigo-950 text-indigo-300' },
  { value: 'proposal', label: 'Proposition', color: 'border-violet-700 bg-violet-950 text-violet-300' },
  { value: 'negotiation', label: 'Négociation', color: 'border-amber-700 bg-amber-950 text-amber-300' },
  { value: 'won', label: 'Gagné ✓', color: 'border-emerald-600 bg-emerald-950 text-emerald-300' },
  { value: 'lost', label: 'Perdu', color: 'border-red-800 bg-red-950 text-red-400' },
]

type Props = {
  contactId: string
  companyId: string
  currentStage: Enums<'contact_stage'>
}

export function StageSelector({ contactId, companyId, currentStage }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleChange(stage: Enums<'contact_stage'>) {
    startTransition(() => {
      updateContactStage(contactId, companyId, stage)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {STAGES.map(({ value, label, color }) => {
          const active = currentStage === value
          return (
            <button
              key={value}
              onClick={() => handleChange(value)}
              disabled={isPending || active}
              aria-label={`Passer au stage : ${label}`}
              aria-pressed={active}
              className={cn(
                'w-full text-left text-sm px-3 py-2 rounded-md border transition-all',
                active
                  ? `${color} font-semibold opacity-100`
                  : 'border-border bg-transparent text-muted-foreground hover:bg-muted/50',
                isPending && 'opacity-50 cursor-not-allowed'
              )}
            >
              {active && <span className="mr-1">→</span>}
              {label}
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
