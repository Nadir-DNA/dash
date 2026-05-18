'use client'

import { useActionState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import { STAGE_OPTIONS, SOURCES } from '@/lib/constants'

type Props = {
  action: (prevState: { error?: string } | null | void, formData: FormData) => Promise<{ error?: string } | void>
  contact?: Tables<'contacts'>
  companies: { id: string; name: string }[]
  defaultCompanyId?: string
  cancelHref: string
}

export function ContactForm({ action, contact, companies, defaultCompanyId, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction}>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {state?.error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {state.error}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">Prénom <span className="text-destructive">*</span></Label>
                <Input id="first_name" name="first_name" defaultValue={contact?.first_name} placeholder="Jean" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Nom <span className="text-destructive">*</span></Label>
                <Input id="last_name" name="last_name" defaultValue={contact?.last_name} placeholder="Dupont" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={contact?.email ?? ''} placeholder="jean@acme.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" name="phone" defaultValue={contact?.phone ?? ''} placeholder="+33 6 00 00 00 00" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="title">Titre / Poste</Label>
                <Input id="title" name="title" defaultValue={contact?.title ?? ''} placeholder="CEO, Directeur Commercial..." />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Company <span className="text-destructive">*</span></Label>
                <Select name="company_id" defaultValue={contact?.company_id ?? defaultCompanyId ?? ''} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select name="stage" defaultValue={contact?.stage ?? 'new'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="value">Valeur estimée (€)</Label>
                <Input id="value" name="value" type="number" step="0.01" min="0" defaultValue={contact?.value ?? ''} placeholder="5000" />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select name="source" defaultValue={contact?.source ?? ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Origine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea name="notes" defaultValue={contact?.notes ?? ''} rows={4} placeholder="Contexte, besoins, prochaines étapes..." />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
          Annuler
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? 'Enregistrement...' : contact ? 'Mettre à jour' : 'Créer le lead'}
        </Button>
      </div>
    </form>
  )
}
