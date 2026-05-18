'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteCampaign } from '@/app/actions/campaigns'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'

type Props = { id: string }

export function DeleteCampaignButton({ id }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await deleteCampaign(id)
      setOpen(false)
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
        aria-label="Supprimer cette campagne"
      >
        <Trash2 className="size-4" />
        {pending ? '...' : 'Supprimer'}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Supprimer cette campagne ?"
        description="Cette action est irréversible. La campagne et toutes ses données seront supprimées."
        confirmLabel="Supprimer"
        onConfirm={handleConfirm}
        pending={pending}
      />
    </>
  )
}
