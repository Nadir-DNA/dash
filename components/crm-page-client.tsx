'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Users, Mail, Search, ChevronRight, Globe, Tag, ChevronLeft } from 'lucide-react'
import { ProjectHeader } from '@/components/sidebar-dash-client'

type Lead = Record<string, unknown>
type Campaign = Record<string, unknown>

const STAGE_LABELS: Record<string, string> = {
  new: 'Nouveau', contacted: 'Contacté', qualified: 'Qualifié',
  proposal: 'Proposition', won: 'Gagné', lost: 'Perdu',
}

const PROJECT_COLORS: Record<string, string> = {
  CRM: '#FFFFFF', SiteVitrine: '#818cf8', Amens: '#22C55E',
  FlashCert: '#a855f7', LeaguePlay: '#F59E0B',
}
const STAGE_COLORS: Record<string, string> = {
  new: '#525252', contacted: '#818cf8', qualified: '#F59E0B',
  proposal: '#3b82f6', won: '#22C55E', lost: '#EF4444',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', active: 'Actif', paused: 'Pausé', done: 'Terminé',
  deployed: 'Déployé', pending: 'En attente',
}
const STATUS_COLORS: Record<string, string> = {
  draft: '#525252', active: '#22C55E', paused: '#F59E0B',
  done: '#818cf8', deployed: '#22C55E', pending: '#F59E0B',
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${color}18`, color,
      border: `1px solid ${color}30`,
    }}>{label}</span>
  )
}

function EmptyState({ project }: { project: string }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, padding: '80px 24px',
      color: 'var(--color-text-tertiary)',
    }}>
      <Users style={{ width: 40, height: 40, opacity: 0.3 }} />
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        Pas encore de données
      </p>
      <p style={{ fontSize: 13, textAlign: 'center', maxWidth: 320 }}>
        Le projet <strong>{project}</strong> n'a pas encore de leads connectés à ce dashboard.
      </p>
    </div>
  )
}

const PAGE_SIZE = 100

async function fetchLeads(project: string, page: number): Promise<{ records: Lead[]; total_count?: number }> {
  const offset = page * PAGE_SIZE
  const isVitrine = project === 'sitevitrine'
  const endpoint = isVitrine ? '/api/sitevitrine' : '/api/contacts'
  const res = await fetch(`${endpoint}?limit=${PAGE_SIZE}&offset=${offset}&count=true`)
  if (!res.ok) throw new Error('fetch error')
  return res.json()
}

function Pagination({ total, page, pageSize, loading, onPage }: { total: number; page: number; pageSize: number; loading: boolean; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        {start}–{end} sur <strong style={{ color: 'var(--color-text)' }}>{total.toLocaleString('fr-FR')}</strong>
        {loading && <span style={{ marginLeft: 8, opacity: 0.5 }}>chargement…</span>}
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button onClick={() => onPage(page - 1)} disabled={page === 0 || loading}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', cursor: page === 0 || loading ? 'not-allowed' : 'pointer', color: page === 0 ? 'var(--color-text-tertiary)' : 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <ChevronLeft style={{ width: 14, height: 14 }} /> Précédent
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = totalPages <= 7 ? i : (page <= 3 ? i : page >= totalPages - 4 ? totalPages - 7 + i : page - 3 + i)
          return (
            <button key={p} onClick={() => onPage(p)} disabled={loading}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--color-border)', background: p === page ? 'var(--color-accent)' : 'var(--color-bg-elevated)', color: p === page ? 'var(--color-bg)' : 'var(--color-text)', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: p === page ? 700 : 400 }}>
              {p + 1}
            </button>
          )
        })}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages - 1 || loading}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', cursor: page >= totalPages - 1 || loading ? 'not-allowed' : 'pointer', color: page >= totalPages - 1 ? 'var(--color-text-tertiary)' : 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          Suivant <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  )
}

function LeadsTable({ leads: initialLeads, project, total: initialTotal, page: initialPage, pageSize }: { leads: Lead[]; project: string; total: number; page: number; pageSize: number }) {
  const [leads, setLeads] = useState(initialLeads)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(initialPage)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')

  const goToPage = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const data = await fetchLeads(project, p)
      setLeads(data.records ?? [])
      if (data.total_count != null) setTotal(data.total_count)
      setPage(p)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch { /* keep current page */ }
    setLoading(false)
  }, [project])

  const filtered = useMemo(() => {
    return leads.filter(l => {
      const name = (project === 'sitevitrine'
        ? String(l.name ?? '')
        : `${l.first_name ?? ''} ${l.last_name ?? ''}`
      ).toLowerCase()
      const matchSearch = !search || name.includes(search.toLowerCase())
      const stage = String(l.stage ?? l.status ?? 'new')
      const matchStage = stageFilter === 'all' || stage === stageFilter
      return matchSearch && matchStage
    })
  }, [leads, search, stageFilter, project])

  const stages = useMemo(() => {
    const s = new Set(leads.map(l => String(l.stage ?? l.status ?? 'new')))
    return Array.from(s)
  }, [leads])

  if (project === 'sitevitrine') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Search + filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-text-tertiary)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un lead..."
              style={{
                width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8,
                border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)',
                color: 'var(--color-text)', fontSize: 13, outline: 'none',
              }}
            />
          </div>
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)',
              background: 'var(--color-bg-elevated)', color: 'var(--color-text)', fontSize: 13,
            }}
          >
            <option value="all">Tous les statuts</option>
            {stages.map(s => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
          </select>
        </div>

        {/* Count */}
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          {filtered.length} site{filtered.length !== 1 ? 's' : ''} sur cette page · <strong style={{ color: 'var(--color-text)' }}>{total.toLocaleString('fr-FR')}</strong> au total
        </p>

        {/* Table */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}>
                {['Entreprise', 'Secteur', 'Téléphone', 'Statut', 'Site', 'Stage'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={String(l.id ?? i)} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] transition-colors">
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>
                    {String(l.name ?? '—')}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {String(l.sector ?? '—')}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                    {String(l.phone ?? '—')}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Badge
                      label={STATUS_LABELS[String(l.status ?? '')] ?? String(l.status ?? '—')}
                      color={STATUS_COLORS[String(l.status ?? '')] ?? '#525252'}
                    />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {l.site_url ? (
                      <a href={String(l.site_url)} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#818cf8', textDecoration: 'none' }}>
                        <Globe style={{ width: 12, height: 12 }} /> Voir
                      </a>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Badge
                      label={STAGE_LABELS[String(l.stage ?? '')] ?? String(l.stage ?? 'new')}
                      color={STAGE_COLORS[String(l.stage ?? '')] ?? '#525252'}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                  Aucun résultat
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={total} page={page} pageSize={pageSize} loading={loading} onPage={goToPage} />
      </div>
    )
  }

  const isGeneral = project === 'general'
  const crmHeaders = isGeneral
    ? ['Projet', 'Nom', 'Entreprise', 'Téléphone', 'Stage', 'Valeur']
    : ['Nom', 'Entreprise', 'Email', 'Téléphone', 'Stage', 'Valeur']

  // CRM leads (contacts) + general view
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--color-text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un lead..."
            style={{
              width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8,
              border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)',
              color: 'var(--color-text)', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)', color: 'var(--color-text)', fontSize: 13,
          }}
        >
          <option value="all">Tous les stages</option>
          {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        {filtered.length} lead{filtered.length !== 1 ? 's' : ''} sur cette page · <strong style={{ color: 'var(--color-text)' }}>{total.toLocaleString('fr-FR')}</strong> au total
      </p>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}>
              {crmHeaders.map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, i) => {
              const projTag = String(l._project ?? '')
              const projColor = PROJECT_COLORS[projTag] ?? '#525252'
              return (
                <tr key={String(l.id ?? i)} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] transition-colors">
                  {isGeneral && (
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                        background: `${projColor}18`, color: projColor, border: `1px solid ${projColor}30`,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: projColor }} />
                        {projTag || '—'}
                      </span>
                    </td>
                  )}
                  <td style={{ padding: '10px 14px' }}>
                    <Link href={`/contacts/${l.id}`} style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', textDecoration: 'none' }}>
                      {String(l.first_name ?? '')} {String(l.last_name ?? '')}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {String(l.company_name ?? '—')}
                  </td>
                  {!isGeneral && (
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {String(l.email ?? '—')}
                    </td>
                  )}
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                    {String(l.phone ?? '—')}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Badge
                      label={STAGE_LABELS[String(l.stage ?? '')] ?? String(l.stage ?? '—')}
                      color={STAGE_COLORS[String(l.stage ?? '')] ?? '#525252'}
                    />
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                    {l.value ? `${Number(l.value).toLocaleString('fr-FR')} €` : '—'}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={crmHeaders.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                Aucun résultat
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination total={total} page={page} pageSize={pageSize} loading={loading} onPage={goToPage} />
    </div>
  )
}

function CampaignsPanel({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
        Aucune campagne pour ce projet.
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {campaigns.map((c, i) => (
        <Link
          key={String(c.id ?? i)}
          href={`/campaigns/${c.id}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: 10, border: '1px solid var(--color-border)',
            textDecoration: 'none', transition: 'all 0.15s',
          }}
          className="hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-elevated)]"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
            }}>
              <Mail style={{ width: 16, height: 16, color: 'var(--color-text-tertiary)' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{String(c.name ?? '—')}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                {Number(c.sent_count ?? 0).toLocaleString('fr-FR')} envoyés · {Number(c.open_count ?? 0)} ouvertures · {Number(c.reply_count ?? 0)} réponses
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge
              label={STATUS_LABELS[String(c.status ?? '')] ?? String(c.status ?? '—')}
              color={STATUS_COLORS[String(c.status ?? '')] ?? '#525252'}
            />
            <ChevronRight style={{ width: 14, height: 14, color: 'var(--color-text-tertiary)' }} />
          </div>
        </Link>
      ))}
    </div>
  )
}

export function CRMPageClient({
  project,
  leads,
  campaigns,
  total = 0,
  page = 0,
  pageSize = 100,
}: {
  project: string
  leads: Lead[]
  campaigns: Campaign[]
  total?: number
  page?: number
  pageSize?: number
}) {
  const [tab, setTab] = useState<'leads' | 'campagnes'>('leads')
  const noData = leads.length === 0 && campaigns.length === 0

  const tabStyle = (active: boolean) => ({
    padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8,
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'var(--color-bg-card)' : 'transparent',
    color: active ? 'var(--color-text)' : 'var(--color-text-tertiary)',
    boxShadow: active ? 'inset 0 0 0 1px var(--color-border)' : 'none',
  })

  return (
    <>
      <ProjectHeader title="CRM" subtitle="Leads & campagnes de prospection" />
      <div className="flex-1 p-6 lg:p-8" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'Leads', value: leads.length, icon: Users },
            { label: 'Campagnes', value: campaigns.length, icon: Mail },
            {
              label: tab === 'leads'
                ? (project === 'sitevitrine' ? 'Déployés' : 'Gagnés')
                : 'Actives',
              value: tab === 'leads'
                ? leads.filter(l => (l.status === 'deployed' || l.stage === 'won')).length
                : campaigns.filter(c => c.status === 'active').length,
              icon: Tag,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} style={{
              padding: '16px', borderRadius: 12, border: '1px solid var(--color-border)',
              background: 'var(--color-bg-elevated)', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                <Icon style={{ width: 14, height: 14, color: 'var(--color-text-tertiary)' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--color-text)' }}>
                {value.toLocaleString('fr-FR')}
              </span>
            </div>
          ))}
        </div>

        {noData ? <EmptyState project={project} /> : (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--color-bg-elevated)', borderRadius: 10, width: 'fit-content', border: '1px solid var(--color-border)' }}>
              <button style={tabStyle(tab === 'leads')} onClick={() => setTab('leads')}>
                Leads <span style={{ fontSize: 11, opacity: 0.6 }}>({leads.length})</span>
              </button>
              <button style={tabStyle(tab === 'campagnes')} onClick={() => setTab('campagnes')}>
                Campagnes <span style={{ fontSize: 11, opacity: 0.6 }}>({campaigns.length})</span>
              </button>
            </div>

            {/* Content */}
            {tab === 'leads'
              ? <LeadsTable leads={leads} project={project} total={total} page={page} pageSize={pageSize} />
              : <CampaignsPanel campaigns={campaigns} />
            }
          </>
        )}
      </div>
    </>
  )
}
