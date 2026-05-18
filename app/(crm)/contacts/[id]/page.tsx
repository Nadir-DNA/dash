import { createClient } from '@/lib/trailbase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { StageSelector } from '@/components/stage-selector'
import { DeleteContactButton } from '@/components/delete-contact-button'
import { Pencil, Mail, Phone, Building2, Calendar, Tag } from 'lucide-react'
import { STAGE_VARIANTS, STAGE_LABELS } from '@/lib/constants'

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await createClient()

  let contact: Record<string, unknown> | null = null
  let interactions: Record<string, unknown>[] = []

  try {
    contact = await client.records('contacts').read(id) as Record<string, unknown>
  } catch {
    notFound()
  }

  if (!contact) notFound()

  try {
    // Fetch company name
    if (contact.company_id) {
      const company = await client.records('companies').read(contact.company_id as string) as Record<string, unknown>
      contact = { ...contact, companies: { id: company.id, name: company.name } }
    }

    // Fetch interactions
    const interactionsRes = await client.records('interactions').list({
      filters: [{ column: 'contact_id', op: 'equal', value: id }],
      order: ['-created_at'],
    })
    interactions = interactionsRes.records ?? []
  } catch {
    // ignore
  }

  const company = contact.companies as { id: string; name: string } | null

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <Link href="/contacts" className="hover:text-foreground">Leads</Link>
            <span>/</span>
            <span className="text-foreground">{contact.first_name as string} {contact.last_name as string}</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary"
              aria-label={`Avatar de ${contact.first_name as string} ${contact.last_name as string}`}
            >
              {(contact.first_name as string)?.[0] ?? '?'}{(contact.last_name as string)?.[0] ?? '?'}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{contact.first_name as string} {contact.last_name as string}</h1>
              {!!contact.title && <p className="text-sm text-muted-foreground">{contact.title as string}</p>}
            </div>
            <Badge variant={STAGE_VARIANTS[contact.stage as string]}>{STAGE_LABELS[contact.stage as string]}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/contacts/${id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Pencil className="size-3" />
            Modifier
          </Link>
          <DeleteContactButton id={id} companyId={contact.company_id as string} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Infos */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!!contact.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4 shrink-0" />
                  <a href={`mailto:${contact.email}`} className="hover:text-foreground">{contact.email as string}</a>
                </div>
              )}
              {!!contact.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4 shrink-0" />
                  <a href={`tel:${contact.phone}`} className="hover:text-foreground">{contact.phone as string}</a>
                </div>
              )}
              {company && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-4 shrink-0" />
                  <Link href={`/companies/${company.id}`} className="hover:text-foreground">{company.name}</Link>
                </div>
              )}
              {!!contact.source && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="size-4 shrink-0" />
                  <span>Source : {contact.source as string}</span>
                </div>
              )}
              {!!contact.value && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-4 shrink-0 text-center">€</span>
                  <span>{Number(contact.value).toLocaleString('fr-FR')} €</span>
                </div>
              )}
              {!!contact.last_contacted_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4 shrink-0" />
                  <span>Dernier contact : {new Date(contact.last_contacted_at as string).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {!!contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes as string}</p>
              </CardContent>
            </Card>
          )}

          {/* Historique interactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Historique</CardTitle>
            </CardHeader>
            <CardContent>
              {interactions && interactions.length > 0 ? (
                <div className="space-y-3">
                  {interactions.map((interaction: Record<string, unknown>) => (
                    <div key={interaction.id as string} className="flex gap-3 text-sm">
                      <div className="mt-0.5 size-2 rounded-full bg-primary shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{interaction.type as string}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(interaction.created_at as string).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        {!!interaction.subject && <p className="text-muted-foreground">{interaction.subject as string}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune interaction enregistrée.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline stage */}
        <div>
          <StageSelector contactId={id} companyId={contact.company_id as string} currentStage={contact.stage as "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost"} />
        </div>
      </div>
    </div>
  )
}
