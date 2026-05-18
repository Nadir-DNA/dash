'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, Calendar, Menu, X, ChevronDown, Trello } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export const PROJECTS = [
  { id: 'general',     label: 'Général',      color: '#F59E0B', separator: false },
  { id: 'crm',         label: 'CRM',          color: '#FFFFFF',  separator: true },
  { id: 'sitevitrine', label: 'SiteVitrine',  color: '#818cf8', separator: false },
  { id: 'flashcert',   label: 'FlashCert',    color: '#a855f7', separator: false },
  { id: 'leagueplay',  label: 'LeaguePlay',   color: '#F59E0B', separator: false },
] as const

export type ProjectId = typeof PROJECTS[number]['id']

const NAV = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard, tooltip: 'Vue d\'ensemble' },
  { href: '/crm',       label: 'CRM',         icon: Users,           tooltip: 'Leads & campagnes' },
  { href: '/kanban',    label: 'Kanban',      icon: Trello,          tooltip: 'Vue Kanban' },
  { href: '/marketing', label: 'Marketing',   icon: Calendar,        tooltip: 'Calendrier de publication' },
]

export function SidebarDashClient() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)

  const projectId = (searchParams.get('p') || 'crm') as ProjectId
  const project = PROJECTS.find(p => p.id === projectId) ?? PROJECTS[0]

  function switchProject(newId: string) {
    setProjectOpen(false)
    // Navigate to current page with new project
    router.push(`${pathname}?p=${newId}`)
  }

  function navHref(href: string) {
    return `${href}?p=${projectId}`
  }

  const sidebar = (
    <aside className={cn('sidebar-dash', mobileOpen && '!translate-x-0 !w-[200px]', 'lg:translate-x-0')}>

      {/* Logo */}
      <div className="sidebar-dash-logo">
        <div style={{
          width: 32, height: 32, background: 'var(--color-accent)',
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--color-bg)',
          flexShrink: 0,
        }}>D</div>
        <span className="sidebar-dash-item-label" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
          Dash
        </span>
      </div>

      {/* Project switcher */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
        <button
          onClick={() => setProjectOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px', borderRadius: 8, border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)', cursor: 'pointer', overflow: 'hidden',
          }}
        >
          {/* Color dot — always visible */}
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: project.color, flexShrink: 0,
            boxShadow: `0 0 6px ${project.color}60`,
          }} />
          {/* Label — fades in on hover */}
          <span className="sidebar-dash-item-label" style={{
            fontSize: 12, fontWeight: 600, color: 'var(--color-text)',
            flex: 1, textAlign: 'left',
          }}>
            {project.label}
          </span>
          <ChevronDown className="sidebar-dash-item-label" style={{ width: 12, height: 12, color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        </button>

        {/* Dropdown */}
        {projectOpen && (
          <div style={{
            position: 'absolute', left: 8, right: 8, top: 'calc(100% - 4px)',
            background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
            borderRadius: 10, padding: '4px', zIndex: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {PROJECTS.map(p => (
              <div key={p.id}>
                {p.separator && (
                  <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
                )}
                <button
                  onClick={() => switchProject(p.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: p.id === projectId ? 'var(--color-bg-card)' : 'transparent',
                    color: p.id === projectId ? 'var(--color-text)' : 'var(--color-text-secondary)',
                    fontSize: 13, fontWeight: p.id === projectId ? 600 : 400,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  {p.label}
                  {p.id === 'general' && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
                      tous
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-dash-nav">
        {NAV.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={navHref(item.href)}
              onClick={() => { setMobileOpen(false); setProjectOpen(false) }}
              className={cn('sidebar-dash-item', isActive && 'active')}
            >
              <span className="sidebar-dash-item-icon">
                <item.icon className="w-5 h-5" />
              </span>
              <span className="sidebar-dash-item-label">{item.label}</span>
              <span className="sidebar-dash-tooltip">{item.tooltip}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {sidebar}

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(o => !o)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </>
  )
}

export function ProjectHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const searchParams = useSearchParams()
  const projectId = (searchParams.get('p') || 'crm') as ProjectId
  const project = PROJECTS.find(p => p.id === projectId) ?? PROJECTS[0]

  return (
    <header className="header-dash">
      <div>
        <h1 className="header-dash-title">{title}</h1>
        {subtitle && <p className="header-dash-meta">{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: project.color, display: 'inline-block',
          boxShadow: `0 0 6px ${project.color}60`,
        }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{project.label}</span>
      </div>
    </header>
  )
}
