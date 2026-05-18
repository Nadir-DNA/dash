'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
      <h2 className="text-lg font-semibold">Erreur du dashboard</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Impossible de charger le dashboard. Veuillez réessayer.
      </p>
      <Button onClick={reset} variant="outline" size="sm">
        Réessayer
      </Button>
    </div>
  )
}
