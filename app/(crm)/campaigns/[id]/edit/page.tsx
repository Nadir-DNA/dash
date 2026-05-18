import { createClient } from '@/lib/trailbase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mail } from 'lucide-react'
import { updateCampaign } from '@/app/actions/campaigns'
import { CampaignForm } from '@/components/campaign-form'
import type { Tables } from '@/types/database'

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await createClient()

  let campaign: Record<string, unknown> | null = null
  let allCompanies: Record<string, unknown>[] = []
  try {
    campaign = await client.records('campaigns').read(id) as Record<string, unknown>
    const companiesRes = await client.records('companies').list({ order: ['name'] })
    allCompanies = companiesRes.records ?? []
  } catch {
    notFound()
  }

  if (!campaign) notFound()

  const action = updateCampaign.bind(null, id)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/campaigns" className="hover:text-foreground">Campaigns</Link>
          <span>/</span>
          <Link href={`/campaigns/${id}`} className="hover:text-foreground">{String(campaign.name ?? '')}</Link>
          <span>/</span>
          <span className="text-foreground">Modifier</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Modifier la campagne</h1>
        </div>
      </div>
      <CampaignForm
        action={action}
        campaign={campaign as Tables<'campaigns'>}
        companies={(allCompanies ?? []) as { id: string; name: string }[]}
        cancelHref={`/campaigns/${id}`}
      />
    </div>
  )
}
