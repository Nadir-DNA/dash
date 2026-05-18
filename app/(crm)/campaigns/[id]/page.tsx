import { createClient } from '@/lib/trailbase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import {
  Mail, Pencil, Send, Eye, MousePointerClick, MessageSquare, CalendarClock, Building2,
} from 'lucide-react'
import { CampaignStatusButton } from '@/components/campaign-status-button'
import { EnrollContactsDialog } from '@/components/enroll-contacts-dialog'
import { UnenrollContactButton } from '@/components/unenroll-contact-button'
import { DeleteCampaignButton } from '@/components/delete-campaign-button'
import { STATUS_VARIANTS, STATUS_LABELS, ENROLLMENT_VARIANTS, ENROLLMENT_LABELS, CHANNEL_LABELS } from '@/lib/constants'

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await createClient()

  let campaign: Record<string, unknown> | null = null
  let enrolled: Record<string, unknown>[] = []
  let allContacts: Record<string, unknown>[] = []

  try {
    campaign = await client.records('campaigns').read(id) as Record<string, unknown>
  } catch {
    notFound()
  }

  if (!campaign) notFound()

  try {
    // Fetch campaign contacts with joins (manual)
    const enrolledRes = await client.records('campaign_contacts').list({
      filters: [{ column: 'campaign_id', op: 'equal', value: id }],
      order: ['-enrolled_at'],
    })
    enrolled = enrolledRes.records ?? []

    // Fetch all contacts for joining
    const contactsRes = await client.records('contacts').list({ order: ['first_name'] })
    allContacts = contactsRes.records ?? []

    // Build company mapping
    const companiesRes = await client.records('companies').list()
    const companiesMap = new Map<string, { id: string; name: string }>()
    for (const c of (companiesRes.records ?? [])) {
      companiesMap.set(c.id as string, { id: c.id as string, name: c.name as string })
    }

    // Attach company name to campaign
    if (campaign.company_id) {
      const c = companiesMap.get(campaign.company_id as string)
      if (c) {
        campaign = { ...campaign, companies: { name: c.name } }
      }
    }

    // Attach contact data + company name to enrolled records
    enrolled = enrolled.map((e) => {
      const contact = allContacts.find(c => c.id === e.contact_id)
      if (!contact) return e
      const contactCompany = contact.company_id ? companiesMap.get(contact.company_id as string) : null
      return {
        ...e,
        contacts: {
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          company_id: contact.company_id,
          companies: contactCompany ? { name: contactCompany.name } : null,
        },
      }
    })
  } catch {
    // ignore
  }

  const companyName = (campaign.companies as { name: string } | null)?.name ?? null

  const sentCount = (campaign.sent_count as number) || 0
  const openCount = (campaign.open_count as number) || 0
  const clickCount = (campaign.click_count as number) || 0
  const replyCount = (campaign.reply_count as number) || 0

  const openRate = sentCount > 0 ? Math.round((openCount / sentCount) * 100) : 0
  const clickRate = sentCount > 0 ? Math.round((clickCount / sentCount) * 100) : 0
  const replyRate = sentCount > 0 ? Math.round((replyCount / sentCount) * 100) : 0

  const enrolledIds = new Set(enrolled?.map(e => e.contact_id as string) ?? [])

  const availableContacts = (allContacts ?? [])
    .filter(c => !enrolledIds.has(c.id as string))
    .map(c => ({
      id: c.id as string,
      first_name: c.first_name as string,
      last_name: c.last_name as string,
      email: c.email as string | null,
      company_name: null, // We could look up, but this is just for the dialog
    }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/campaigns" className="hover:text-foreground">Campaigns</Link>
          <span>/</span>
          <span className="text-foreground">{campaign.name as string}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="size-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">{campaign.name as string}</h1>
            <Badge variant={STATUS_VARIANTS[campaign.status as string]}>
              {STATUS_LABELS[campaign.status as string]}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <CampaignStatusButton id={id} currentStatus={campaign.status as "draft" | "active" | "paused" | "completed"} />
            <Link href={`/campaigns/${id}/edit`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              <Pencil className="size-4" />
              Modifier
            </Link>
            <DeleteCampaignButton id={id} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Envoyés', value: sentCount, icon: Send },
              { label: `Ouverts (${openRate}%)`, value: openCount, icon: Eye },
              { label: `Clics (${clickRate}%)`, value: clickCount, icon: MousePointerClick },
              { label: `Réponses (${replyRate}%)`, value: replyCount, icon: MessageSquare },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                  <Icon className="size-3.5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-xl font-bold tabular-nums">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enrolled contacts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Contacts enrôlés</CardTitle>
              <EnrollContactsDialog campaignId={id} availableContacts={availableContacts} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Enrôlé le</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrolled?.map((e: Record<string, unknown>) => {
                    const contact = e.contacts as Record<string, unknown> | undefined
                    if (!contact) return null
                    return (
                      <TableRow key={e.id as string}>
                        <TableCell>
                          <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                            {contact.first_name as string} {contact.last_name as string}
                          </Link>
                          {(contact.companies as { name: string } | null) && (
                            <div className="text-xs text-muted-foreground">{(contact.companies as { name: string }).name}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(contact.email as string) ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ENROLLMENT_VARIANTS[e.status as string]}>
                            {ENROLLMENT_LABELS[e.status as string]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(e.enrolled_at as string).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <UnenrollContactButton campaignId={id} contactId={contact.id as string} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {(!enrolled || enrolled.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucun contact enrôlé. Ajoutez-en avec le bouton ci-dessus.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {companyName && (
                <div className="flex items-start gap-2">
                  <Building2 className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-muted-foreground text-xs">Company</div>
                    <div>{companyName}</div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Mail className="size-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-muted-foreground text-xs">Canal</div>
                  <div>{CHANNEL_LABELS[campaign.channel as string]}</div>
                </div>
              </div>
              {!!campaign.scheduled_at && (
                <div className="flex items-start gap-2">
                  <CalendarClock className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-muted-foreground text-xs">Planifiée</div>
                    <div>{new Date(campaign.scheduled_at as string).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  </div>
                </div>
              )}
              <Separator />
              <div>
                <div className="text-muted-foreground text-xs mb-1">Créée</div>
                <div>{new Date(campaign.created_at as string).toLocaleDateString('fr-FR')}</div>
              </div>
            </CardContent>
          </Card>

          {!!campaign.subject && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Objet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{campaign.subject as string}</p>
              </CardContent>
            </Card>
          )}

          {!!campaign.body && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contenu</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground line-clamp-10">{campaign.body as string}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
