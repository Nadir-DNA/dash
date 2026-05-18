'use client'

import { useTransition } from 'react'
import { unenrollContact } from '@/app/actions/campaigns'
import { X } from 'lucide-react'

type Props = { campaignId: string; contactId: string }

export function UnenrollContactButton({ campaignId, contactId }: Props) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
      disabled={pending}
      onClick={() => startTransition(async () => { await unenrollContact(campaignId, contactId) })}
      title="Retirer de la campagne"
    >
      <X className="size-3.5" />
    </button>
  )
}
