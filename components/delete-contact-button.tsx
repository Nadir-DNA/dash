'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteContact } from '@/app/actions/contacts'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'

export function DeleteContactButton({ id, companyId }: { id: string; companyId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await deleteContact(id, companyId)
      setOpen(false)
    })
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Supprimer ce lead"
      >
        <Trash2 className="size-3" />
        Supprimer
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Supprimer ce lead ?"
        description="Cette action est irréversible. Le lead sera définitivement supprimé."
        confirmLabel="Supprimer"
        onConfirm={handleConfirm}
        pending={isPending}
      />
    </>
  )
}
