import { createClient } from '@/lib/trailbase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Building2, Plus, Users, TrendingUp, Mail, DollarSign, Pencil,
  Globe, Tag, Hash,
} from 'lucide-react'
import { CompanyPipelineChart } from '@/components/charts/company-pipeline'
import { STAGES, STAGE_VARIANTS, STATUS_VARIANTS, STATUS_LABELS } from '@/lib/constants'

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await createClient()

  let company: Record<string, unknown> | null = null
  let contacts: Record<string, unknown>[] = []
  let campaigns: Record<string, unknown>[] = []

  try {
    company = await client.records('companies').read(id) as Record<string, unknown>
  } catch {
    notFound()
  }

  if (!company) notFound()

  try {
    const contactsRes = await client.records('contacts').list({
      filters: [{ column: 'company_id', op: 'equal', value: id }],
      order: ['-created_at'],
    })
    contacts = contactsRes.records ?? []

    const campaignsRes = await client.records('campaigns').list({
      filters: [{ column: 'company_id', op: 'equal', value: id }],
      order: ['-created_at'],
    })
    campaigns = campaignsRes.records ?? []
  } catch {
    // ignore
  }

  const wonCount = contacts?.filter(c => c.stage === 'won').length ?? 0
  const conversionRate = contacts?.length ? Math.round((wonCount / contacts.length) * 100) : 0
  const totalValue = contacts?.reduce((s, c) => s + ((c.value as number) ?? 0), 0) ?? 0
  const wonValue = contacts?.filter(c => c.stage === 'won').reduce((s, c) => s + ((c.value as number) ?? 0), 0) ?? 0

  const stageStats = (contacts ?? []).reduce<Record<string, { count: number; value: number }>>((acc, c) => {
    const stage = c.stage as string
    if (!acc[stage]) acc[stage] = { count: 0, value: 0 }
    acc[stage].count++
    acc[stage].value += (c.value as number) ?? 0
    return acc
  }, {})

  const pipelineData = STAGES.map(s => ({
    label: s.label,
    count: stageStats[s.key]?.count ?? 0,
    value: stageStats[s.key]?.value ?? 0,
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb + header */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/companies" className="hover:text-foreground transition-colors">Companies</Link>
          <span>/</span>
          <span className="text-foreground">{company.name as string}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">{company.name as string}</h1>
            {!!company.industry && <Badge variant="outline">{company.industry as string}</Badge>}
            {!!company.size && <Badge variant="secondary">{company.size as string} employés</Badge>}
          </div>
          <div className="flex gap-2">
            <Link href={`/companies/${id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Pencil className="size-3" />
              Modifier
            </Link>
            <Link href={`/companies/${id}/contacts/new`} className={buttonVariants({ size: 'sm' })}>
              <Plus className="size-4" />
              Ajouter lead
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Leads', value: contacts?.length ?? 0, icon: Users, sub: null },
          { label: 'Pipeline total', value: `${totalValue.toLocaleString('fr-FR')} €`, icon: DollarSign, sub: null },
          { label: 'Gagnés', value: `${wonValue.toLocaleString('fr-FR')} €`, icon: TrendingUp, sub: `${wonCount} lead${wonCount > 1 ? 's' : ''}` },
          { label: 'Conversion', value: `${conversionRate}%`, icon: TrendingUp, sub: null },
        ].map(({ label, value, icon: Icon, sub }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="size-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-2xl font-bold tabular-nums">{value}</div>
              {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pipeline chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pipeline par stage</CardTitle>
            </CardHeader>
            <CardContent>
              <CompanyPipelineChart data={pipelineData} />
            </CardContent>
          </Card>

          {/* Leads table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="size-4" />
                Leads <Badge variant="secondary">{contacts?.length ?? 0}</Badge>
              </CardTitle>
              <Link href={`/companies/${id}/contacts/new`} className={buttonVariants({ size: 'sm', variant: 'ghost' })}>
                <Plus className="size-4" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Valeur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts?.map((contact: Record<string, unknown>) => (
                    <TableRow key={contact.id as string}>
                      <TableCell>
                        <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                          {contact.first_name as string} {contact.last_name as string}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{contact.email as string ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{contact.title as string ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={STAGE_VARIANTS[contact.stage as string]}>
                          {STAGES.find(s => s.key === contact.stage)?.label ?? (contact.stage as string)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                        {contact.value ? `${Number(contact.value).toLocaleString('fr-FR')} €` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!contacts || contacts.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucun lead.{' '}
                        <Link href={`/companies/${id}/contacts/new`} className="underline underline-offset-2">
                          Ajouter →
                        </Link>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Campaigns */}
          {campaigns && campaigns.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Mail className="size-4" />
                  Campagnes <Badge variant="secondary">{campaigns.length}</Badge>
                </CardTitle>
                <Link href={`/campaigns/new`} className={buttonVariants({ size: 'sm', variant: 'ghost' })}>
                  <Plus className="size-4" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Envoyés</TableHead>
                      <TableHead className="text-right">Ouverts</TableHead>
                      <TableHead className="text-right">Taux ouv.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign: Record<string, unknown>) => {
                      const sent = (campaign.sent_count as number) || 0
                      const opens = (campaign.open_count as number) || 0
                      const rate = sent > 0 ? Math.round((opens / sent) * 100) : 0
                      return (
                        <TableRow key={campaign.id as string}>
                          <TableCell>
                            <Link href={`/campaigns/${campaign.id}`} className="font-medium hover:underline">
                              {campaign.name as string}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANTS[campaign.status as string]}>
                              {STATUS_LABELS[campaign.status as string]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{sent}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{opens}</TableCell>
                          <TableCell className="text-right text-sm">
                            {sent > 0 ? `${rate}%` : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!!company.domain && (
                <div className="flex items-start gap-2">
                  <Globe className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-muted-foreground text-xs">Domaine</div>
                    <div>{company.domain as string}</div>
                  </div>
                </div>
              )}
              {!!company.website && (
                <div className="flex items-start gap-2">
                  <Globe className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-muted-foreground text-xs">Site web</div>
                    <a href={company.website as string} target="_blank" rel="noreferrer" className="hover:underline text-primary">
                      {(company.website as string).replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>
              )}
              {!!company.industry && (
                <div className="flex items-start gap-2">
                  <Tag className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-muted-foreground text-xs">Secteur</div>
                    <div>{company.industry as string}</div>
                  </div>
                </div>
              )}
              {!!company.size && (
                <div className="flex items-start gap-2">
                  <Hash className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-muted-foreground text-xs">Taille</div>
                    <div>{company.size as string} employés</div>
                  </div>
                </div>
              )}
              {!!(company.domain || company.website || company.industry || company.size) && <Separator />}
              <div>
                <div className="text-muted-foreground text-xs mb-1">Créée</div>
                <div>{new Date(company.created_at as string).toLocaleDateString('fr-FR')}</div>
              </div>
              {!!company.notes && (
                <>
                  <Separator />
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">Notes</div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{company.notes as string}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stage breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Répartition pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {STAGES.map(s => {
                const stats = stageStats[s.key]
                if (!stats || stats.count === 0) return null
                const pct = contacts?.length ? Math.round((stats.count / contacts.length) * 100) : 0
                return (
                  <div key={s.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="tabular-nums">{stats.count} <span className="text-muted-foreground">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full">
                      <div className="h-1.5 bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {(!contacts || contacts.length === 0) && (
                <p className="text-xs text-muted-foreground">Aucun lead</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
