'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Instagram,
  Twitter,
  Youtube,
  Music2,
  RefreshCw,
} from 'lucide-react'

type Network = 'tiktok' | 'instagram' | 'twitter' | 'youtube'
type Status = 'draft' | 'scheduled' | 'published'
type Project = 'amens' | 'leagueplay' | 'sitevitrine' | 'flashcert'

interface Post {
  id: string
  date: string
  title: string
  description: string
  project: Project
  network: Network
  status: Status
  createdAt: string
}

const PROJECTS: { id: Project; label: string; color: string }[] = [
  { id: 'amens', label: 'Amens', color: '#2dd4a8' },
  { id: 'leagueplay', label: 'LeaguePlay', color: '#a855f7' },
  { id: 'sitevitrine', label: 'Site Vitrine', color: '#f59e0b' },
  { id: 'flashcert', label: 'FlashCert', color: '#3b82f6' },
]

const NETWORKS: { id: Network; label: string; icon: any; color: string }[] = [
  { id: 'tiktok', label: 'TikTok', icon: Music2, color: '#000000' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#e4405f' },
  { id: 'twitter', label: 'Twitter/X', icon: Twitter, color: '#000000' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: '#ff0000' },
]

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function formatDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function PublicationsCalendar() {
  const [posts, setPosts] = useState<Post[]>([])
  const [today] = useState(formatDateKey(new Date()))
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [filterProject, setFilterProject] = useState<Project | 'all'>('all')
  const [filterNetwork, setFilterNetwork] = useState<Network | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editPost, setEditPost] = useState<Post | null>(null)
  const [formDate, setFormDate] = useState('')
  // Load posts from API, fallback localStorage
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/publications')
        if (res.ok) {
          const data = await res.json()
          if (data.posts?.length) {
            setPosts(data.posts)
            localStorage.setItem('dash-publications', JSON.stringify(data.posts))
            return
          }
        }
      } catch {}
      // Fallback localStorage
      try {
        const saved = localStorage.getItem('dash-publications')
        if (saved) setPosts(JSON.parse(saved))
      } catch {}
    }
    load()
  }, [])

  const addPost = async (post: Omit<Post, 'id' | 'createdAt'>) => {
    const newPost: Post = { ...post, id: generateId(), createdAt: new Date().toISOString() }
    // Try API first
    try {
      await fetch('/api/publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      })
    } catch {}
    setPosts(prev => {
      const updated = [...prev, newPost]
      localStorage.setItem('dash-publications', JSON.stringify(updated))
      return updated
    })
    setShowForm(false)
    setEditPost(null)
  }

  const updatePost = async (id: string, updates: Partial<Post>) => {
    try {
      await fetch('/api/publications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
    } catch {}
    setPosts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p)
      localStorage.setItem('dash-publications', JSON.stringify(updated))
      return updated
    })
    setShowForm(false)
    setEditPost(null)
  }

  const deletePost = async (id: string) => {
    try {
      await fetch(`/api/publications?id=${id}`, { method: 'DELETE' })
    } catch {}
    setPosts(prev => {
      const updated = prev.filter(p => p.id !== id)
      localStorage.setItem('dash-publications', JSON.stringify(updated))
      return updated
    })
  }

  const toggleStatus = (id: string, currentStatus: Status) => {
    const next: Status = currentStatus === 'draft' ? 'scheduled' : currentStatus === 'scheduled' ? 'published' : 'draft'
    updatePost(id, { status: next })
  }

  // Calendar
  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()

  const filteredPosts = posts.filter(p => {
    if (filterProject !== 'all' && p.project !== filterProject) return false
    if (filterNetwork !== 'all' && p.network !== filterNetwork) return false
    return true
  })

  const postsByDate: Record<string, Post[]> = {}
  filteredPosts.forEach(p => {
    if (!postsByDate[p.date]) postsByDate[p.date] = []
    postsByDate[p.date].push(p)
  })

  const statusIcon = (s: Status) => {
    switch (s) {
      case 'draft': return <Clock className="w-3 h-3" />
      case 'scheduled': return <CalendarIcon className="w-3 h-3" />
      case 'published': return <CheckCircle2 className="w-3 h-3" />
    }
  }

  const statusColor = (s: Status) => {
    switch (s) {
      case 'draft': return 'var(--color-text-tertiary)'
      case 'scheduled': return 'var(--color-accent)'
      case 'published': return '#22c55e'
    }
  }

  return (
    <div className="publications-page">
      {/* Header */}
      <div className="publications-header">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Calendrier de publication</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {posts.length} publication{posts.length > 1 ? 's' : ''} planifiée{posts.length > 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-publication" onClick={() => { setFormDate(''); setEditPost(null); setShowForm(true) }}>
          <Plus className="w-4 h-4" /> Nouvelle publication
        </button>
      </div>

      {/* Filters */}
      <div className="publications-filters">
        <div className="filter-group">
          <label className="filter-label">Projet</label>
          <div className="filter-chips">
            <button className={`chip ${filterProject === 'all' ? 'active' : ''}`} onClick={() => setFilterProject('all')}>Tous</button>
            {PROJECTS.map(p => (
              <button key={p.id} className={`chip ${filterProject === p.id ? 'active' : ''}`} onClick={() => setFilterProject(p.id)}>
                <span className="chip-dot" style={{ background: p.color }} /> {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label">Réseau</label>
          <div className="filter-chips">
            <button className={`chip ${filterNetwork === 'all' ? 'active' : ''}`} onClick={() => setFilterNetwork('all')}>Tous</button>
            {NETWORKS.map(n => (
              <button key={n.id} className={`chip ${filterNetwork === n.id ? 'active' : ''}`} onClick={() => setFilterNetwork(n.id)}>
                <n.icon className="w-3.5 h-3.5" /> {n.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar card */}
      <div className="calendar-card">
        <div className="calendar-nav">
          <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) } else setCurrentMonth(m => m - 1) }} className="calendar-nav-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="calendar-month-label">{MONTHS[currentMonth]} {currentYear}</span>
          <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) } else setCurrentMonth(m => m + 1) }} className="calendar-nav-btn">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="calendar-grid-header">
          {DAYS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
        </div>
        <div className="calendar-grid">
          {Array.from({ length: startOffset }).map((_, i) => (<div key={`e-${i}`} className="calendar-cell empty" />))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayPosts = postsByDate[dateKey] || []
            const isToday = dateKey === today
            return (
              <div key={dateKey} className={`calendar-cell ${isToday ? 'today' : ''}`}
                onClick={() => { setFormDate(dateKey); setEditPost(null); setShowForm(true) }}>
                <span className="calendar-day-number">{day}</span>
                {dayPosts.length > 0 && (
                  <div className="calendar-posts-stack">
                    {dayPosts.slice(0, 3).map(p => (
                      <div key={p.id} className="calendar-post-dot" style={{ background: PROJECTS.find(pr => pr.id === p.project)?.color }}
                        title={`${p.title} (${p.status})`}
                        onClick={(e) => { e.stopPropagation(); setEditPost(p); setFormDate(p.date); setShowForm(true) }} />
                    ))}
                    {dayPosts.length > 3 && <span className="calendar-post-more">+{dayPosts.length - 3}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Posts list */}
      {filteredPosts.length > 0 && (
        <div className="publications-list">
          <h3 className="publications-list-title">
            Publications <span className="publications-list-count">{filteredPosts.length}</span>
          </h3>
          {filteredPosts.sort((a, b) => a.date.localeCompare(b.date)).map(post => {
            const project = PROJECTS.find(p => p.id === post.project)
            const network = NETWORKS.find(n => n.id === post.network)
            return (
              <div key={post.id} className="publication-item" onClick={() => { setEditPost(post); setFormDate(post.date); setShowForm(true) }}>
                <div className="publication-item-left">
                  <div className="publication-item-project" style={{ background: project?.color }} />
                  <div className="publication-item-info">
                    <span className="publication-item-title">{post.title}</span>
                    <span className="publication-item-meta">
                      {post.date} · {project?.label} · {network && <network.icon className="w-3 h-3 inline" />} {network?.label}
                    </span>
                  </div>
                </div>
                <div className="publication-item-right">
                  <span className="publication-item-status" style={{ color: statusColor(post.status) }}
                    onClick={(e) => { e.stopPropagation(); toggleStatus(post.id, post.status) }}>
                    {statusIcon(post.status)}
                    {post.status === 'draft' ? 'Brouillon' : post.status === 'scheduled' ? 'Planifié' : 'Publié'}
                  </span>
                  <button className="publication-item-delete" onClick={(e) => { e.stopPropagation(); deletePost(post.id) }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Post form modal */}
      {showForm && (
        <PostForm
          post={editPost}
          date={formDate}
          onSave={(data) => {
            if (editPost) updatePost(editPost.id, data)
            else addPost(data as any)
          }}
          onClose={() => { setShowForm(false); setEditPost(null) }}
        />
      )}
    </div>
  )
}

/* ── Post Form Modal ── */
function PostForm({
  post, date, onSave, onClose,
}: {
  post: Post | null
  date: string
  onSave: (data: Omit<Post, 'id' | 'createdAt'>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(post?.title || '')
  const [description, setDescription] = useState(post?.description || '')
  const [project, setProject] = useState<Project>(post?.project || 'amens')
  const [network, setNetwork] = useState<Network>(post?.network || 'tiktok')
  const [status, setStatus] = useState<Status>(post?.status || 'draft')
  const [postDate, setPostDate] = useState(post?.date || date)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !postDate) return
    onSave({ title: title.trim(), description: description.trim(), project, network, status, date: postDate })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{post ? 'Modifier' : 'Nouvelle'} publication</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field">
            <label className="form-label">Date</label>
            <input type="date" value={postDate} onChange={e => setPostDate(e.target.value)} className="form-input" required />
          </div>
          <div className="form-field">
            <label className="form-label">Titre *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: 5 signes que vous devriez..." className="form-input" required />
          </div>
          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description optionnelle..." className="form-textarea" rows={3} />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Projet</label>
              <select value={project} onChange={e => setProject(e.target.value as Project)} className="form-input">
                {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Réseau</label>
              <select value={network} onChange={e => setNetwork(e.target.value as Network)} className="form-input">
                {NETWORKS.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Statut</label>
            <div className="status-chips">
              {([
                { id: 'draft' as Status, label: 'Brouillon' },
                { id: 'scheduled' as Status, label: 'Planifié' },
                { id: 'published' as Status, label: 'Publié' },
              ]).map(s => (
                <button key={s.id} type="button" className={`chip ${status === s.id ? 'active' : ''}`} onClick={() => setStatus(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary">{post ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
