'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { enrollContacts } from '@/app/actions/campaigns'
import { UserPlus, Search, Check } from 'lucide-react'

type Contact = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  company_name: string | null
}

type Props = {
  campaignId: string
  availableContacts: Contact[]
}

export function EnrollContactsDialog({ campaignId, availableContacts }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const filtered = availableContacts.filter(c => {
    const q = search.toLowerCase()
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.company_name?.toLowerCase().includes(q) ?? false)
    )
  })

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleEnroll() {
    if (selected.size === 0) return
    setError(null)
    startTransition(async () => {
      const result = await enrollContacts(campaignId, Array.from(selected))
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setSelected(new Set())
        setSearch('')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <UserPlus className="size-4" />
        Enrôler des contacts
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter des contacts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
              aria-label="Rechercher un contact"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Aucun contact disponible</p>
            )}
            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{c.first_name} {c.last_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.email ?? '—'}{c.company_name ? ` · ${c.company_name}` : ''}
                  </div>
                </div>
                {selected.has(c.id) && <Check className="size-4 text-primary flex-shrink-0" />}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-muted-foreground">
              {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
            </span>
            <Button onClick={handleEnroll} disabled={pending || selected.size === 0} size="sm">
              {pending ? 'Enrôlement...' : `Enrôler ${selected.size > 0 ? selected.size : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
