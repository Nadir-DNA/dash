import { createClient } from '@/lib/trailbase/server'
import { KanbanBoard, type KanbanCard } from '@/components/kanban-board'
import { ProjectHeader } from '@/components/sidebar-dash-client'

const PROJECT_META: Record<string, { label: string; color: string }> = {
  crm:         { label: 'CRM',         color: '#FFFFFF' },
  sitevitrine: { label: 'SiteVitrine', color: '#818cf8' },
  flashcert:   { label: 'FlashCert',   color: '#a855f7' },
  leagueplay:  { label: 'LeaguePlay',  color: '#F59E0B' },
  general:     { label: 'Général',     color: '#F59E0B' },
}

async function loadCards(projectFilter: string): Promise<KanbanCard[]> {
  const client = await createClient()
  const cards: KanbanCard[] = []

  const loadCRM = projectFilter === 'general' || projectFilter === 'crm'
  const loadSV  = projectFilter === 'general' || projectFilter === 'sitevitrine'

  const fetches = await Promise.all([
    loadCRM ? client.records('contacts').list({ order: ['-created_at'], pagination: { limit: 300 } }) : null,
    loadSV  ? client.records('sitevitrine_sites').list({ order: ['-created_at'], pagination: { limit: 200 } }) : null,
  ])

  const [contactsRes, sitesRes] = fetches

  if (contactsRes) {
    const meta = PROJECT_META['crm']
    for (const c of contactsRes.records ?? []) {
      const id = String(c.id ?? '')
      cards.push({
        id,
        shortId: id.slice(-6),
        title: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—',
        subtitle: String(c.company_name ?? c.email ?? ''),
        project: 'CRM',
        projectColor: meta.color,
        stage: String(c.stage ?? 'new'),
        phone: c.phone ? String(c.phone) : undefined,
        tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
        table: 'contacts',
      })
    }
  }

  if (sitesRes) {
    const meta = PROJECT_META['sitevitrine']
    for (const s of sitesRes.records ?? []) {
      const id = String(s.id ?? '')
      cards.push({
        id,
        shortId: id.slice(-6),
        title: String(s.name ?? '—'),
        subtitle: String(s.sector ?? ''),
        project: 'SiteVitrine',
        projectColor: meta.color,
        stage: String(s.stage ?? s.status ?? 'new'),
        phone: s.phone ? String(s.phone) : undefined,
        tags: s.labels ? String(s.labels).split(',').map(t => t.trim()).filter(Boolean) : [],
        table: 'sitevitrine_sites',
      })
    }
  }

  return cards
}

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>
}) {
  const { p = 'crm' } = await searchParams
  const cards = await loadCards(p)

  const meta = PROJECT_META[p] ?? PROJECT_META['crm']
  const subtitle = p === 'general'
    ? `${cards.length} items — tous projets`
    : `${cards.length} items — ${meta.label}`

  return (
    <>
      <ProjectHeader title="Kanban" subtitle={subtitle} />
      <div className="flex-1 p-6 lg:p-8" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <KanbanBoard initialCards={cards} projectFilter={p} />
      </div>
    </>
  )
}
