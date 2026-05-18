'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export type KanbanCard = {
  id: string
  shortId: string
  title: string
  subtitle?: string
  project: string
  projectColor: string
  stage: string
  phone?: string
  tags?: string[]
  table: 'contacts' | 'sitevitrine_sites'
}

export type KanbanColumn = {
  key: string
  label: string
  color: string
}

const COLUMNS: KanbanColumn[] = [
  { key: 'new',       label: 'Nouveau',      color: '#525252' },
  { key: 'contacted', label: 'Contacté',     color: '#818cf8' },
  { key: 'qualified', label: 'Qualifié',     color: '#F59E0B' },
  { key: 'proposal',  label: 'Proposition',  color: '#3b82f6' },
  { key: 'won',       label: 'Gagné',        color: '#22C55E' },
  { key: 'lost',      label: 'Perdu',        color: '#EF4444' },
]

// SiteVitrine stage mapping
const SV_STAGE_MAP: Record<string, string> = {
  pending:   'new',
  contacted: 'contacted',
  quoted:    'proposal',
  won:       'won',
  deployed:  'won',
  lost:      'lost',
}

function ProjectTag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}

function Card({
  card,
  onDragStart,
}: {
  card: KanbanCard
  onDragStart: (card: KanbanCard) => void
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(card)}
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '10px 12px',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        userSelect: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--color-border-hover)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Top: project tag + short ID */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ProjectTag label={card.project} color={card.projectColor} />
        <span style={{
          fontSize: 9, fontFamily: 'monospace', color: 'var(--color-text-tertiary)',
          background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          padding: '1px 5px', borderRadius: 4,
        }}>
          #{card.shortId}
        </span>
      </div>

      {/* Title */}
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3 }}>
        {card.title}
      </p>

      {/* Subtitle + phone */}
      {(card.subtitle || card.phone) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {card.subtitle && (
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{card.subtitle}</p>
          )}
          {card.phone && (
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
              {card.phone}
            </p>
          )}
        </div>
      )}

      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {card.tags.slice(0, 3).map(tag => (
            <span key={tag} style={{
              fontSize: 9, fontWeight: 500, color: 'var(--color-text-tertiary)',
              background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
              padding: '1px 6px', borderRadius: 10,
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Column({
  col,
  cards,
  onDragStart,
  onDrop,
}: {
  col: KanbanColumn
  cards: KanbanCard[]
  onDragStart: (card: KanbanCard) => void
  onDrop: (stage: string) => void
}) {
  const [over, setOver] = useState(false)

  return (
    <div
      style={{
        minWidth: 240,
        width: 240,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        borderRadius: 12,
        border: `1px solid ${over ? col.color + '50' : 'var(--color-border)'}`,
        background: over ? `${col.color}06` : 'var(--color-bg-elevated)',
        transition: 'border-color 0.15s, background 0.15s',
        overflow: 'hidden',
      }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop(col.key) }}
    >
      {/* Column header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-bg-elevated)',
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: col.color, boxShadow: `0 0 6px ${col.color}60`,
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{col.label}</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: cards.length > 0 ? col.color : 'var(--color-text-tertiary)',
          background: cards.length > 0 ? `${col.color}18` : 'transparent',
          border: cards.length > 0 ? `1px solid ${col.color}30` : 'none',
          padding: '1px 7px', borderRadius: 20,
          minWidth: 22, textAlign: 'center',
        }}>
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 60 }}>
        {cards.map(card => (
          <Card key={card.id} card={card} onDragStart={onDragStart} />
        ))}
        {cards.length === 0 && (
          <div style={{
            flex: 1, minHeight: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: 'var(--color-text-tertiary)',
            border: `1px dashed ${over ? col.color + '40' : 'var(--color-border)'}`,
            borderRadius: 8,
          }}>
            Déposer ici
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({
  initialCards,
  projectFilter,
}: {
  initialCards: KanbanCard[]
  projectFilter: string
}) {
  const router = useRouter()
  const [cards, setCards] = useState(initialCards)
  const [search, setSearch] = useState('')
  const [filterProject, setFilterProject] = useState(projectFilter === 'general' ? 'all' : projectFilter)
  const dragging = useRef<KanbanCard | null>(null)

  // Unique projects present in cards
  const projects = Array.from(new Set(initialCards.map(c => c.project)))

  const visible = cards.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.shortId.includes(search) || (c.subtitle ?? '').toLowerCase().includes(search.toLowerCase())
    const matchProject = filterProject === 'all' || c.project === filterProject
    return matchSearch && matchProject
  })

  const byStage = COLUMNS.reduce<Record<string, KanbanCard[]>>((acc, col) => {
    acc[col.key] = visible.filter(c => (SV_STAGE_MAP[c.stage] ?? c.stage) === col.key)
    return acc
  }, {})

  async function handleDrop(stage: string) {
    const card = dragging.current
    if (!card || card.stage === stage) return
    dragging.current = null

    // Optimistic update
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, stage } : c))

    // Persist via API
    try {
      const endpoint = card.table === 'contacts' ? '/api/contacts' : '/api/sitevitrine'
      const field = card.table === 'contacts' ? 'stage' : 'stage'
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, [field]: stage }),
      })
      router.refresh()
    } catch {
      // Rollback
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, stage: card.stage } : c))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, ID..."
          style={{
            flex: 1, minWidth: 200, maxWidth: 320,
            padding: '7px 12px', borderRadius: 8, fontSize: 13,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text)', outline: 'none',
          }}
        />
        {projects.length > 1 && (
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: 8, fontSize: 13,
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text)',
            }}
          >
            <option value="all">Tous les projets</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>
          {visible.length} item{visible.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Board */}
      <div style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 16,
        flex: 1,
      }}>
        {COLUMNS.map(col => (
          <Column
            key={col.key}
            col={col}
            cards={byStage[col.key] ?? []}
            onDragStart={card => { dragging.current = card }}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  )
}
