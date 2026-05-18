import { createClient } from '@/lib/trailbase/server'
import { STAGES } from '@/lib/constants'
import { DashboardClient } from '@/components/dashboard-client'
import { ProjectHeader } from '@/components/sidebar-dash-client'
import { GeneralDashboard } from '@/components/general-dashboard'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1); d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

async function CRMDashboard() {
  const client = await createClient()
  const now30 = daysAgo(30)
  const [contactsRes, companiesRes, campaignsRes] = await Promise.all([
    client.records('contacts').list({ order: ['-created_at'], pagination: { limit: 500 } }),
    client.records('companies').list({ order: ['name'], pagination: { limit: 200 } }),
    client.records('campaigns').list({ order: ['-created_at'], pagination: { limit: 100 } }),
  ])
  const contacts = contactsRes.records ?? []
  const companies = companiesRes.records ?? []
  const campaigns = campaignsRes.records ?? []
  const companiesMap = new Map<string, string>()
  for (const c of companies) companiesMap.set(c.id as string, c.name as string)
  const contactsWithCompany: Record<string, unknown>[] = contacts.map((c: Record<string, unknown>) => ({
    ...c,
    companies: c.company_id ? { name: companiesMap.get(c.company_id as string) ?? null } : null,
  }))
  const leadsThisMonth = contactsWithCompany.filter((c: Record<string, unknown>) => (c.created_at as string) >= now30).length
  const companiesThisMonth = companies.filter((c: Record<string, unknown>) => (c.created_at as string) >= now30).length
  const stageStats = contactsWithCompany.reduce<Record<string, { count: number; value: number }>>((acc, c) => {
    const stage = c.stage as string
    if (!acc[stage]) acc[stage] = { count: 0, value: 0 }
    acc[stage].count++
    acc[stage].value += (c.value as number) ?? 0
    return acc
  }, {})
  const pipelineFunnelData = STAGES.map(s => ({ stage: s.key, label: s.label, count: stageStats[s.key]?.count ?? 0, value: stageStats[s.key]?.value ?? 0 }))
  const totalValue = contactsWithCompany.reduce((s: number, c: Record<string, unknown>) => s + ((c.value as number) ?? 0), 0)
  const wonValue = stageStats['won']?.value ?? 0
  const wonCount = stageStats['won']?.count ?? 0
  const totalContacts = contactsWithCompany.length
  const conversionRate = totalContacts > 0 ? Math.round((wonCount / totalContacts) * 100) : 0
  const activeCampaigns = campaigns.filter((c: Record<string, unknown>) => c.status === 'active').length
  const sourceStats = contactsWithCompany.reduce<Record<string, number>>((acc, c) => { const s = (c.source as string) ?? 'Autre'; acc[s] = (acc[s] || 0) + 1; return acc }, {})
  const sourceData = Object.entries(sourceStats).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  const companyValue = contactsWithCompany.reduce<Record<string, { name: string; value: number; leads: number }>>((acc, c) => {
    const companyName = (c.companies as { name: string } | null)?.name ?? 'Inconnu'
    if (!acc[companyName]) acc[companyName] = { name: companyName, value: 0, leads: 0 }
    acc[companyName].value += (c.value as number) ?? 0
    acc[companyName].leads++
    return acc
  }, {})
  const topCompanies = Object.values(companyValue).filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 8)
  const now = new Date()
  const activityMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i -= 3) { const d = new Date(now); d.setDate(d.getDate() - i); activityMap[d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })] = 0 }
  contactsWithCompany.filter((c: Record<string, unknown>) => (c.created_at as string) >= daysAgo(30)).forEach(c => { const day = new Date(c.created_at as string).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); if (activityMap[day] !== undefined) activityMap[day]++ })
  const activityData = Object.entries(activityMap).map(([date, leads]) => ({ date, leads }))
  const recentLeads = contactsWithCompany.slice(0, 6)
  return <DashboardClient data={{ contactsWithCompany, companies, campaigns, totalContacts, totalValue, wonValue, wonCount, conversionRate, activeCampaigns, pipelineFunnelData, sourceData, topCompanies, activityData, recentLeads, leadsThisMonth, companiesThisMonth }} />
}

async function SiteVitrineDashboard() {
  const client = await createClient()
  const allRes = await client.records('sitevitrine_sites').list({ order: ['-created_at'], pagination: { limit: 200 } })
  const all = allRes.records ?? []
  const deployed = all.filter((s: Record<string, unknown>) => s.status === 'deployed').length
  const thisMonth = all.filter((s: Record<string, unknown>) => (s.created_at as string) >= startOfMonth()).length
  const kpis = [
    { label: 'Sites au total', value: all.length, unit: '' },
    { label: 'Déployés', value: deployed, unit: '' },
    { label: 'Ce mois', value: thisMonth, unit: 'nouveaux' },
    { label: 'Taux déploiement', value: all.length > 0 ? Math.round((deployed / all.length) * 100) : 0, unit: '%' },
  ]
  return (
    <div className="flex-1 p-6 lg:p-8 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {kpis.map(({ label, value, unit }) => (
          <div key={label} style={{ padding: '20px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--color-text)' }}>
              {value.toLocaleString('fr-FR')}{unit && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>{unit}</span>}
            </p>
          </div>
        ))}
      </div>
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Sites récents</h3>
          <a href="/crm?p=sitevitrine" style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>Voir tous →</a>
        </div>
        {all.slice(0, 8).map((s: Record<string, unknown>) => (
          <div key={String(s.id)} style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{String(s.name ?? '—')}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{String(s.sector ?? '')} · {String(s.address ?? '')}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.status === 'deployed' ? 'rgba(34,197,94,0.12)' : 'rgba(82,82,82,0.15)', color: s.status === 'deployed' ? '#22C55E' : '#525252' }}>
                {s.status === 'deployed' ? 'Déployé' : String(s.status ?? '—')}
              </span>
              {!!s.site_url && <a href={String(s.site_url)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#818cf8', textDecoration: 'none' }}>↗</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ComingSoonDashboard({ project }: { project: string }) {
  return (
    <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '80px 24px' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📊</div>
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-secondary)' }}>En construction</p>
      <p style={{ fontSize: 13, textAlign: 'center', maxWidth: 320, color: 'var(--color-text-tertiary)' }}>
        Les métriques pour <strong style={{ color: 'var(--color-text-secondary)' }}>{project}</strong> seront disponibles prochainement.
      </p>
    </div>
  )
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p = 'crm' } = await searchParams
  const labels: Record<string, string> = { general: 'Général', crm: 'CRM', sitevitrine: 'SiteVitrine', amens: 'Amens', flashcert: 'FlashCert', leagueplay: 'LeaguePlay' }
  const label = labels[p] ?? p
  return (
    <>
      <ProjectHeader title="Dashboard" subtitle={p === 'general' ? 'Vue consolidée — tous projets' : `Vue d'ensemble — ${label}`} />
      {p === 'general'     && <GeneralDashboard />}
      {p === 'crm'         && <CRMDashboard />}
      {p === 'sitevitrine' && <SiteVitrineDashboard />}
      {(p === 'amens' || p === 'flashcert' || p === 'leagueplay') && <ComingSoonDashboard project={label} />}
    </>
  )
}
