import { createClient } from '@/lib/trailbase/server'
import Link from 'next/link'

const PROJECTS_META = [
  { id: 'crm',         label: 'CRM',         color: '#FFFFFF',  href: '/dashboard?p=crm',         table: 'contacts',         nameField: 'first_name' },
  { id: 'sitevitrine', label: 'SiteVitrine',  color: '#818cf8',  href: '/dashboard?p=sitevitrine',  table: 'sitevitrine_sites', nameField: 'name' },
  { id: 'flashcert',   label: 'FlashCert',    color: '#a855f7',  href: '/dashboard?p=flashcert',    table: 'flashcert_users',  nameField: 'email' },
  { id: 'leagueplay',  label: 'LeaguePlay',   color: '#F59E0B',  href: '/dashboard?p=leagueplay',   table: 'leagueplay_players', nameField: 'username' },
] as const

function startOfMonth() {
  const d = new Date()
  d.setDate(1); d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function GeneralDashboard() {
  const client = await createClient()

  // Fetch all active tables in parallel
  const [contactsRes, sitevitrineRes, flashcertRes, leagueplayRes] = await Promise.all([
    client.records('contacts').list({ order: ['-created_at'], pagination: { limit: 500 } }),
    client.records('sitevitrine_sites').list({ order: ['-created_at'], pagination: { limit: 200 } }),
    client.records('flashcert_users').list({ order: ['-created_at'], pagination: { limit: 100 } }),
    client.records('leagueplay_players').list({ order: ['-created_at'], pagination: { limit: 100 } }),
  ])

  const contacts = contactsRes.records ?? []
  const sites = sitevitrineRes.records ?? []
  const flashcertUsers = flashcertRes.records ?? []
  const leagueplayPlayers = leagueplayRes.records ?? []
  const som = startOfMonth()

  const projectStats = [
    {
      id: 'crm', label: 'CRM', color: '#FFFFFF',
      total: contacts.length,
      thisMonth: contacts.filter(r => (r.created_at as string) >= som).length,
      won: contacts.filter(r => r.stage === 'won').length,
      href: '/crm?p=crm',
      recentItems: contacts.slice(0, 4).map(c => ({
        id: String(c.id ?? ''),
        label: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—',
        sub: String(c.stage ?? 'new'),
      })),
    },
    {
      id: 'sitevitrine', label: 'SiteVitrine', color: '#818cf8',
      total: sites.length,
      thisMonth: sites.filter(r => (r.created_at as string) >= som).length,
      won: sites.filter(r => r.status === 'deployed').length,
      href: '/crm?p=sitevitrine',
      recentItems: sites.slice(0, 4).map(s => ({
        id: String(s.id ?? ''),
        label: String(s.name ?? '—'),
        sub: String(s.status ?? 'pending'),
      })),
    },
    {
      id: 'flashcert', label: 'FlashCert', color: '#a855f7',
      total: flashcertUsers.length,
      thisMonth: flashcertUsers.filter(r => (r.created_at as string) >= som).length,
      won: 0,
      href: '/dashboard?p=flashcert',
      recentItems: flashcertUsers.slice(0, 4).map(u => ({
        id: String(u.id ?? ''),
        label: String(u.email ?? '—'),
        sub: 'user',
      })),
    },
    {
      id: 'leagueplay', label: 'LeaguePlay', color: '#F59E0B',
      total: leagueplayPlayers.length,
      thisMonth: leagueplayPlayers.filter(r => (r.created_at as string) >= som).length,
      won: 0,
      href: '/dashboard?p=leagueplay',
      recentItems: leagueplayPlayers.slice(0, 4).map(p => ({
        id: String(p.id ?? ''),
        label: String(p.username ?? p.name ?? '—'),
        sub: 'joueur',
      })),
    },
  ]

  const totalLeads = projectStats.reduce((s, p) => s + p.total, 0)
  const totalThisMonth = projectStats.reduce((s, p) => s + p.thisMonth, 0)
  const totalWon = projectStats.reduce((s, p) => s + p.won, 0)

  return (
    <div className="flex-1 p-6 lg:p-8 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* KPI globaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total leads', value: totalLeads, sub: 'tous projets confondus' },
          { label: 'Ce mois', value: totalThisMonth, sub: 'nouveaux leads' },
          { label: 'Convertis / Déployés', value: totalWon, sub: 'won + deployed' },
          { label: 'Projets actifs', value: 4, sub: 'CRM · SiteVitrine · FlashCert · LP' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{
            padding: '20px', borderRadius: 12,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>{value.toLocaleString('fr-FR')}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 6 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Cards par projet */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {projectStats.map(proj => (
          <div key={proj.id} style={{
            border: '1px solid var(--color-border)', borderRadius: 14,
            overflow: 'hidden', background: 'var(--color-bg-elevated)',
          }}>
            {/* Header projet */}
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: proj.color, flexShrink: 0,
                  boxShadow: `0 0 8px ${proj.color}60`,
                }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{proj.label}</span>
              </div>
              <Link href={proj.href} style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>
                Voir tout →
              </Link>
            </div>

            {/* Stats mini */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
              {[
                { label: 'Total', value: proj.total },
                { label: 'Ce mois', value: proj.thisMonth },
                { label: proj.id === 'sitevitrine' ? 'Déployés' : 'Gagnés', value: proj.won },
              ].map(({ label, value }) => (
                <div key={label} style={{ flex: 1, padding: '12px', borderRight: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Recent items */}
            <div>
              {proj.recentItems.length === 0 ? (
                <p style={{ padding: '20px', fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
                  Aucune donnée
                </p>
              ) : proj.recentItems.map(item => (
                <div key={item.id} style={{
                  padding: '9px 18px', borderBottom: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text)', fontWeight: 500 }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10, color: 'var(--color-text-tertiary)',
                      background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                      padding: '1px 6px', borderRadius: 4,
                    }}>{item.sub}</span>
                    <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
                      #{item.id.slice(-6)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Lien vers Kanban */}
      <div style={{
        border: '1px dashed var(--color-border)', borderRadius: 12,
        padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Vue Kanban consolidée</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Gérez tous les leads de tous les projets dans un seul tableau Kanban
          </p>
        </div>
        <Link href="/kanban?p=general" style={{
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'var(--color-accent)', color: 'var(--color-bg)', textDecoration: 'none',
        }}>
          Ouvrir le Kanban →
        </Link>
      </div>
    </div>
  )
}
