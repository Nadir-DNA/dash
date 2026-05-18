/**
 * Dash — HOME : hub multi-projets
 * Grille 2×2 des 4 projets : Amens, SiteVitrine, LeaguePlay, FlashCert
 */
import { getAllMetrics } from '@/lib/metrics/aggregator'
import { LayoutDashboard, Globe, Swords, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

const PROJECTS = [
  { id: 'amens',    name: 'Amens',      tagline: 'Bien-être & rendez-vous', icon: LayoutDashboard, color: '#22C55E', href: '/dashboard?p=amens' },
  { id: 'sitevitrine', name: 'SiteVitrine', tagline: 'Sites professionnels', icon: Globe,            color: '#818cf8', href: '/dashboard?p=sitevitrine' },
  { id: 'leagueplay',  name: 'LeaguePlay',  tagline: 'Sport & communauté',   icon: Swords,           color: '#F59E0B', href: '/dashboard?p=leagueplay' },
  { id: 'flashcert', name: 'FlashCert',  tagline: 'Formation & CPF',        icon: ShieldCheck,      color: '#a855f7', href: '/dashboard?p=flashcert' },
] as const

function IconBox({ icon: Icon, color }: { icon: React.ElementType; color: string }) {
  return (
    <div
      style={{
        width: 40, height: 40, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}15`,
        color,
      }}
    >
      <Icon className="w-5 h-5" />
    </div>
  )
}

function ValueDisplay({ value, unit }: { value: string | number; unit?: string }) {
  return (
    <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--color-text)' }}>
      {value}
      {unit && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>{unit}</span>}
    </span>
  )
}

function MetricRow({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
        {value}{unit || ''}
      </span>
    </div>
  )
}

function ProjectCard({ project, metrics }: {
  project: typeof PROJECTS[number]
  metrics: { key: string; value: number; unit: string; description: string }[]
}) {
  // Pick the most relevant metrics for each project
  const main = metrics?.[0]
  const secondary = metrics?.slice(1, 4) ?? []

  return (
    <Link
      href={project.href}
      style={{ display: 'block', textDecoration: 'none' }}
      className="group"
    >
      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 20,
          transition: 'all 0.2s var(--ease-smooth)',
        }}
        className="group-hover:border-[var(--color-border-hover)] group-hover:bg-[var(--color-bg-elevated)]"
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <IconBox icon={project.icon} color={project.color} />
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--color-text)' }}>
              {project.name}
            </h3>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{project.tagline}</p>
          </div>
        </div>

        {/* Main metric */}
        {main && (
          <div style={{ marginBottom: 12 }}>
            <ValueDisplay value={main.value} unit={main.unit === 'count' ? '' : main.unit} />
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{main.description}</p>
          </div>
        )}

        {/* Secondary metrics */}
        {secondary.filter(m => m.key !== '_status' && !m.key.startsWith('connection_error')).length > 0 && (
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 12, paddingTop: 8 }}>
            {secondary.filter(m => m.key !== '_status' && !m.key.startsWith('connection_error')).map(m => (
              <MetricRow key={m.key} label={m.description} value={m.value} unit={m.unit === 'count' ? '' : m.unit} />
            ))}
          </div>
        )}

        {/* Status badge */}
        {(!main || main.key === '_status' || main.key.startsWith('connection_error')) && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
            Non configuré
          </div>
        )}
      </div>
    </Link>
  )
}

export default async function HomePage() {
  let projectsMetrics: { project: string; metrics: { key: string; value: number; unit: string; description: string }[] }[] = []
  try {
    const all = await getAllMetrics()
    projectsMetrics = all.projects.map(p => ({
      project: p.project,
      metrics: p.metrics,
    }))
  } catch {
    // Silently degrade
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '32px 24px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-accent)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-bg)' }}>
              D
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--color-text)' }}>
                Dash
              </h1>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                Hub multi-projets · Nothing Glyph Dashboard
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', width: '100%', padding: '32px 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)' }}>
            Projets
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 6 }}>
            Vue d&apos;ensemble de tous vos projets en un coup d&apos;œil
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {PROJECTS.map(project => {
            const pm = projectsMetrics.find(m => m.project === project.id)
            return (
              <ProjectCard
                key={project.id}
                project={project}
                metrics={pm?.metrics ?? []}
              />
            )
          })}
        </div>

        {/* Quick link to CRM */}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 8,
              background: 'var(--color-accent)', color: 'var(--color-bg)',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              fontFamily: 'var(--font-display)',
            }}
          >
            <LayoutDashboard className="w-4 h-4" />
            CRM Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
