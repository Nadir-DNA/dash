import { createClient } from '@/lib/trailbase/server'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from "@/components/ui/button"
import { Mail, Plus, Send, Eye, MousePointerClick, MessageSquare } from 'lucide-react'
import { STATUS_VARIANTS, STATUS_LABELS, CHANNEL_LABELS } from '@/lib/constants'

export default async function CampaignsPage() {
  const client = await createClient()

  const campaignsRes = await client.records('campaigns').list({
    order: ['-created_at'],
  })
  const rawCampaigns = campaignsRes.records ?? []

  // Fetch companies mapping for join
  const companiesRes = await client.records('companies').list()
  const companiesMap = new Map<string, string>()
  for (const c of (companiesRes.records ?? [])) {
    companiesMap.set(c.id as string, c.name as string)
  }

  const campaigns = rawCampaigns.map((c) => ({
    ...c,
    companies: c.company_id ? { name: companiesMap.get(c.company_id as string) ?? null } : null,
  }))

  const active = campaigns?.filter(c => c.status === 'active').length ?? 0
  const totalSent = campaigns?.reduce((s, c) => s + ((c.sent_count as number) ?? 0), 0) ?? 0
  const totalOpens = campaigns?.reduce((s, c) => s + ((c.open_count as number) ?? 0), 0) ?? 0
  const openRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Campaigns</h1>
          <Badge variant="secondary">{campaigns?.length ?? 0}</Badge>
        </div>
        <Link href="/campaigns/new" className={buttonVariants({ size: 'sm' })}>
          <Plus className="size-4" />
          Nouvelle campagne
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Actives', value: active, icon: Mail },
          { label: 'Envois total', value: totalSent.toLocaleString('fr-FR'), icon: Send },
          { label: 'Ouvertures', value: totalOpens.toLocaleString('fr-FR'), icon: Eye },
          { label: "Taux d'ouverture", value: `${openRate}%`, icon: MousePointerClick },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campagne</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">
                <Send className="size-3 inline mr-1" />Envoyés
              </TableHead>
              <TableHead className="text-right">
                <Eye className="size-3 inline mr-1" />Ouverts
              </TableHead>
              <TableHead className="text-right">
                <MousePointerClick className="size-3 inline mr-1" />Clics
              </TableHead>
              <TableHead className="text-right">
                <MessageSquare className="size-3 inline mr-1" />Rép.
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns?.map((campaign: Record<string, unknown>) => {
              const sentCount = (campaign.sent_count as number) || 0
              const openCount = (campaign.open_count as number) || 0
              const clickCount = (campaign.click_count as number) || 0
              const replyCount = (campaign.reply_count as number) || 0
              const openPct = sentCount > 0
                ? Math.round((openCount / sentCount) * 100)
                : 0
              const company = (campaign.companies as { name: string | null } | null)
              return (
                <TableRow key={campaign.id as string}>
                  <TableCell>
                    <Link href={`/campaigns/${campaign.id}`} className="font-medium hover:underline">
                      {campaign.name as string}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {company
                      ? company.name
                      : <span className="text-muted-foreground/50 italic">Global</span>}
                  </TableCell>
                  <TableCell className="text-sm">{CHANNEL_LABELS[campaign.channel as string]}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[campaign.status as string]}>
                      {STATUS_LABELS[campaign.status as string]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{sentCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {openCount}
                    {openPct > 0 && <span className="text-muted-foreground text-xs ml-1">({openPct}%)</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{clickCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{replyCount}</TableCell>
                </TableRow>
              )
            })}
            {(!campaigns || campaigns.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Aucune campagne. Créez-en une.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
