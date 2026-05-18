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

type Props = {
  action: (prevState: { error?: string } | null | void, formData: FormData) => Promise<{ error?: string } | void>
  campaign?: Tables<'campaigns'>
  companies: { id: string; name: string }[]
  cancelHref: string
}

export function CampaignForm({ action, campaign, companies, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction}>
      <div className="space-y-4">
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
                <Input id="name" name="name" defaultValue={campaign?.name} placeholder="Campagne Q1 2026" required />
              </div>
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select name="channel" defaultValue={campaign?.channel ?? 'email'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="sms">💬 SMS</SelectItem>
                    <SelectItem value="sequence">🔄 Séquence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Company (optionnel)</Label>
                <Select name="company_id" defaultValue={campaign?.company_id ?? ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les companies..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Globale (toutes)</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="subject">Objet de l&apos;email</Label>
                <Input id="subject" name="subject" defaultValue={campaign?.subject ?? ''} placeholder="Objet de votre email..." />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="scheduled_at">Date d&apos;envoi planifiée</Label>
                <Input
                  id="scheduled_at"
                  name="scheduled_at"
                  type="datetime-local"
                  defaultValue={campaign?.scheduled_at
                    ? new Date(campaign.scheduled_at).toISOString().slice(0, 16)
                    : ''}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contenu du message</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              name="body"
              defaultValue={campaign?.body ?? ''}
              rows={8}
              placeholder="Bonjour {{first_name}},&#10;&#10;Je vous contacte au sujet de..."
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Variables disponibles : {'{{first_name}}'}, {'{{last_name}}'}, {'{{company}}'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <Link href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
          Annuler
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? 'Enregistrement...' : campaign ? 'Mettre à jour' : 'Créer la campagne'}
        </Button>
      </div>
    </form>
  )
}
