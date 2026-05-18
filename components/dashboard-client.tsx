'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Users,
  DollarSign,
  Building2,
  TrendingUp,
  Mail,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from 'lucide-react'
import { KpiCard } from '@/components/ui/kpi-card'
import { STAGES, STAGE_VARIANTS, STAGE_LABELS } from '@/lib/constants'

const ChartSkeleton = ({ height = 200 }: { height?: number }) => (
  <div style={{ height, borderRadius: 8, background: 'var(--color-bg-elevated)', animation: 'pulse 1.5s ease-in-out infinite' }} />
)

const PipelineFunnelChart = dynamic(
  () => import('@/components/charts/pipeline-funnel').then(m => m.PipelineFunnelChart),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> }
)
const SourceDonutChart = dynamic(
  () => import('@/components/charts/source-donut').then(m => m.SourceDonutChart),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> }
)
const CompaniesBarChart = dynamic(
  () => import('@/components/charts/companies-bar').then(m => m.CompaniesBarChart),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> }
)
const ActivityLineChart = dynamic(
  () => import('@/components/charts/activity-line').then(m => m.ActivityLineChart),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> }
)

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

interface DashboardData {
  contactsWithCompany: Record<string, unknown>[]
  companies: Record<string, unknown>[]
  campaigns: Record<string, unknown>[]
  totalContacts: number
  totalValue: number
  wonValue: number
  wonCount: number
  conversionRate: number
  activeCampaigns: number
  pipelineFunnelData: { stage: string; label: string; count: number; value: number }[]
  sourceData: { name: string; value: number }[]
  topCompanies: { name: string; value: number; leads: number }[]
  activityData: { date: string; leads: number }[]
  recentLeads: Record<string, unknown>[]
  leadsThisMonth: number
  companiesThisMonth: number
}

/* ═══════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════ */

export function DashboardClient({ data }: { data: DashboardData }) {
  const {
    totalContacts,
    totalValue,
    wonValue,
    wonCount,
    conversionRate,
    activeCampaigns,
    companies,
    campaigns,
    pipelineFunnelData,
    sourceData,
    topCompanies,
    activityData,
    recentLeads,
    leadsThisMonth,
    companiesThisMonth,
  } = data

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── KPI Strip (Glyph cards) ── */}
      <section className="section-dash">
        <div className="section-dash-header">
          <div>
            <h2 className="section-dash-title">Métriques principales</h2>
            <p className="section-dash-subtitle">Performance CRM en temps réel</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/contacts/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                border border-[var(--color-border)] text-[var(--color-text-secondary)]
                hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Lead
            </Link>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                bg-[var(--color-accent)] text-[var(--color-bg)]
                hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Campagne
            </Link>
          </div>
        </div>

        <div className="kpi-grid stagger-fade">
          <KpiCard
            label="Leads total"
            value={totalContacts}
            description={`+${leadsThisMonth} ce mois`}
            showCircular={false}
          />
          <KpiCard
            label="Pipeline"
            value={totalValue}
            unit="€"
            description={`${wonValue.toLocaleString('fr-FR')} € gagnés`}
            target={Math.max(totalValue * 1.5, 100000)}
            showCircular={false}
          />
          <KpiCard
            label="Companies"
            value={companies.length}
            description={`+${companiesThisMonth} ce mois`}
            showCircular={false}
          />
          <KpiCard
            label="Conversion"
            value={conversionRate}
            unit="%"
            description={`${wonCount} lead${wonCount > 1 ? 's' : ''} gagnés`}
            target={100}
          />
          <KpiCard
            label="Campagnes actives"
            value={activeCampaigns}
            description={`${campaigns.length} au total`}
            target={Math.max(campaigns.length * 2, 10)}
            showCircular={false}
          />
        </div>
      </section>

      {/* ── Charts Row 1 ── */}
      <section className="section-dash">
        <div className="section-dash-header">
          <div>
            <h2 className="section-dash-title">Analyse</h2>
            <p className="section-dash-subtitle">Pipeline et sources de leads</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Pipeline par stage</h3>
            </div>
            <PipelineFunnelChart data={pipelineFunnelData} />
          </div>
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Sources</h3>
            </div>
            <SourceDonutChart data={sourceData} />
          </div>
        </div>
      </section>

      {/* ── Charts Row 2 ── */}
      <section className="section-dash">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Activité — 30 derniers jours</h3>
            </div>
            <ActivityLineChart data={activityData} />
          </div>
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Top companies par pipeline</h3>
            </div>
            <CompaniesBarChart data={topCompanies} />
          </div>
        </div>
      </section>

      {/* ── Bottom: Recent Leads + Campaigns ── */}
      <section className="section-dash">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent leads */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Leads récents</h3>
              <Link
                href="/contacts"
                className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                Voir tout →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 px-3 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Nom</th>
                    <th className="text-left py-2 px-3 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Company</th>
                    <th className="text-left py-2 px-3 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Stage</th>
                    <th className="text-right py-2 px-3 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((c: Record<string, unknown>) => (
                    <tr key={c.id as string} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] transition-colors">
                      <td className="py-2.5 px-3">
                        <Link href={`/contacts/${c.id}`} className="font-medium text-[var(--color-text)] hover:underline">
                          {c.first_name as string} {c.last_name as string}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-text-secondary)]">
                        {(c.companies as { name: string } | null)?.name ?? '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded
                          bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                          {STAGE_LABELS[c.stage as string] ?? c.stage as string}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-[var(--color-text-secondary)]">
                        {c.value ? `${Number(c.value).toLocaleString('fr-FR')} €` : '—'}
                      </td>
                    </tr>
                  ))}
                  {recentLeads.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[var(--color-text-tertiary)] text-sm">
                        Aucun lead encore.{' '}
                        <Link href="/contacts/new" className="underline underline-offset-2 hover:text-[var(--color-text-secondary)]">
                          Créer le premier →
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Campaign perf */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Performances campagnes</h3>
              <Link
                href="/campaigns"
                className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                Voir tout →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 px-3 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Campagne</th>
                    <th className="text-left py-2 px-3 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Statut</th>
                    <th className="text-right py-2 px-3 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Envoyés</th>
                    <th className="text-right py-2 px-3 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Taux ouv.</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c: Record<string, unknown>) => {
                    const sent = (c.sent_count as number) || 0
                    const opens = (c.open_count as number) || 0
                    const rate = sent > 0 ? Math.round((opens / sent) * 100) : 0
                    return (
                      <tr key={c.id as string} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] transition-colors">
                        <td className="py-2.5 px-3">
                          <Link href={`/campaigns/${c.id}`} className="font-medium text-[var(--color-text)] hover:underline">
                            {c.name as string}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded
                            ${c.status === 'active'
                              ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]'
                              : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                            }`}>
                            {c.status === 'active' ? 'Actif' : c.status === 'draft' ? 'Brouillon' : 'Archivé'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[var(--color-text-secondary)]">{sent}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[var(--color-text-secondary)]">
                          {sent > 0 ? `${rate}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[var(--color-text-tertiary)] text-sm">
                        Aucune campagne.{' '}
                        <Link href="/campaigns/new" className="underline underline-offset-2 hover:text-[var(--color-text-secondary)]">
                          Créer →
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
