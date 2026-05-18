import { createClient } from '@/lib/trailbase/server'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { createCampaign } from '@/app/actions/campaigns'
import { CampaignForm } from '@/components/campaign-form'

export default async function NewCampaignPage() {
  const client = await createClient()
  const companiesRes = await client.records('companies').list({ order: ['name'] })
  const companies = companiesRes.records ?? []

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/campaigns" className="hover:text-foreground">Campaigns</Link>
          <span>/</span>
          <span className="text-foreground">Nouvelle</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Nouvelle campagne</h1>
        </div>
      </div>
      <CampaignForm
        action={createCampaign}
        companies={companies ?? []}
        cancelHref="/campaigns"
      />
    </div>
  )
}
