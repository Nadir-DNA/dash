import { createClient } from '@/lib/trailbase/server'
import { CRMPageClient } from '@/components/crm-page-client'

const PAGE_SIZE = 100

async function getCRMData(page: number) {
  const client = await createClient()
  const offset = page * PAGE_SIZE
  const [contactsRes, campaignsRes, companiesRes] = await Promise.all([
    client.records('contacts').list({
      order: ['-created_at'],
      pagination: { limit: PAGE_SIZE, offset },
      count: true,
    }),
    client.records('campaigns').list({ order: ['-created_at'], pagination: { limit: 200 } }),
    client.records('companies').list({ order: ['name'], pagination: { limit: 200 } }),
  ])
  const companies = companiesRes.records ?? []
  const companiesMap = new Map(companies.map(c => [c.id as string, c.name as string]))
  const contacts = (contactsRes.records ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    company_name: c.company_id ? (companiesMap.get(c.company_id as string) ?? '') : '',
  }))
  return {
    contacts,
    campaigns: campaignsRes.records ?? [],
    total: contactsRes.total_count ?? contacts.length,
    page,
  }
}

async function getSiteVitrineData(page: number) {
  const client = await createClient()
  const offset = page * PAGE_SIZE
  const res = await client.records('sitevitrine_sites').list({
    order: ['-created_at'],
    pagination: { limit: PAGE_SIZE, offset },
    count: true,
  })
  return {
    sites: res.records ?? [],
    total: res.total_count ?? (res.records ?? []).length,
    page,
  }
}

async function getGeneralData(page: number) {
  const client = await createClient()
  const offset = page * PAGE_SIZE
  const [contactsRes, companiesRes, sitesRes, campaignsRes] = await Promise.all([
    client.records('contacts').list({
      order: ['-created_at'],
      pagination: { limit: PAGE_SIZE, offset },
      count: true,
    }),
    client.records('companies').list({ order: ['name'], pagination: { limit: 200 } }),
    client.records('sitevitrine_sites').list({ order: ['-created_at'], pagination: { limit: 50 } }),
    client.records('campaigns').list({ order: ['-created_at'], pagination: { limit: 100 } }),
  ])
  const companiesMap = new Map((companiesRes.records ?? []).map(c => [c.id as string, c.name as string]))
  const contacts = (contactsRes.records ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    company_name: c.company_id ? (companiesMap.get(c.company_id as string) ?? '') : '',
    _project: 'CRM',
  }))
  const sites = (sitesRes.records ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    _project: 'SiteVitrine',
  }))
  const allLeads = [
    ...contacts,
    ...sites.map(s => ({
      ...s,
      first_name: (s as Record<string, unknown>).name as string,
      last_name: '',
      stage: ((s as Record<string, unknown>).stage ?? (s as Record<string, unknown>).status ?? 'new') as string,
    })),
  ]
  return {
    allLeads,
    campaigns: campaignsRes.records ?? [],
    total: (contactsRes.total_count ?? contacts.length) + (sitesRes.records ?? []).length,
    page,
  }
}

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>
}) {
  const { p = 'crm' } = await searchParams

  if (p === 'general') {
    const { allLeads, campaigns, total } = await getGeneralData(0)
    return <CRMPageClient project="general" leads={allLeads} campaigns={campaigns} total={total} page={0} pageSize={PAGE_SIZE} />
  }

  if (p === 'sitevitrine') {
    const { sites, total } = await getSiteVitrineData(0)
    return <CRMPageClient project="sitevitrine" leads={sites} campaigns={[]} total={total} page={0} pageSize={PAGE_SIZE} />
  }

  if (p === 'crm') {
    const { contacts, campaigns, total } = await getCRMData(0)
    return <CRMPageClient project="crm" leads={contacts} campaigns={campaigns} total={total} page={0} pageSize={PAGE_SIZE} />
  }

  return <CRMPageClient project={p} leads={[]} campaigns={[]} total={0} page={0} pageSize={PAGE_SIZE} />
}
