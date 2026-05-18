'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { updateCampaignStatus } from '@/app/actions/campaigns'
import type { Enums } from '@/types/database'

type Props = {
  id: string
  currentStatus: Enums<'campaign_status'>
}

const TRANSITIONS: Record<Enums<'campaign_status'>, { label: string; next: Enums<'campaign_status'> } | null> = {
  draft: { label: '▶ Activer', next: 'active' },
  active: { label: '⏸ Mettre en pause', next: 'paused' },
  paused: { label: '▶ Reprendre', next: 'active' },
  completed: null,
}

export function CampaignStatusButton({ id, currentStatus }: Props) {
  const [pending, startTransition] = useTransition()
  const transition = TRANSITIONS[currentStatus]

  if (!transition) return null

  return (
    <Button
      size="sm"
      variant={currentStatus === 'active' ? 'outline' : 'default'}
      disabled={pending}
      onClick={() => startTransition(async () => { await updateCampaignStatus(id, transition.next) })}
    >
      {pending ? '...' : transition.label}
    </Button>
  )
}
