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
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import { INDUSTRIES, COMPANY_SIZES } from '@/lib/constants'

type Props = {
  action: (prevState: { error?: string } | null | void, formData: FormData) => Promise<{ error?: string } | void>
  company?: Tables<'companies'>
  cancelHref: string
}

export function CompanyForm({ action, company, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {state.error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="name">Nom <span className="text-destructive">*</span></Label>
              <Input id="name" name="name" defaultValue={company?.name} placeholder="Acme Corp" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="domain">Domaine</Label>
              <Input id="domain" name="domain" defaultValue={company?.domain ?? ''} placeholder="acme.com" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website">Site web</Label>
              <Input id="website" name="website" defaultValue={company?.website ?? ''} placeholder="https://acme.com" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="industry">Secteur</Label>
              <Select name="industry" defaultValue={company?.industry ?? ''}>
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="size">Taille</Label>
              <Select name="size" defaultValue={company?.size ?? ''}>
                <SelectTrigger id="size">
                  <SelectValue placeholder="Nb employés..." />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={company?.notes ?? ''} rows={3} placeholder="Contexte, objectifs..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 mt-4">
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
          Annuler
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? 'Enregistrement...' : company ? 'Mettre à jour' : 'Créer la company'}
        </Button>
      </div>
    </form>
  )
}
