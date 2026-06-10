/**
 * Dash — HOME : cockpit multi-projets.
 * Une carte par projet (registre lib/projects.ts) : métriques (revenu d'abord),
 * santé, déploiement, et avancement lu depuis Obsidian.
 */
import { getAllMetrics } from '@/lib/metrics/aggregator'
import { getProjectsStatus, type ProjectStatus } from '@/lib/metrics/status'
import { LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { PROJECTS, projectHref, PROJECT_STATUS_LABEL, type ProjectDef } from '@/lib/projects'

// Cockpit toujours frais (statut temps réel + lecture FS Obsidian).
export const dynamic = 'force-dynamic'

/** "il y a 3 h", "il y a 2 j"… à partir d'un timestamp ms. */
function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const min = Math.round(diff / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  return `il y a ${d} j`
}

const DEPLOY_COLOR: Record<string, string> = {
  READY: '#22C55E', BUILDING: '#F59E0B', QUEUED: '#F59E0B', INITIALIZING: '#F59E0B',
  ERROR: '#EF4444', CANCELED: '#94A3B8', UNKNOWN: '#94A3B8',
}
const DEPLOY_LABEL: Record<string, string> = {
  READY: 'Déployé', BUILDING: 'Build…', QUEUED: 'En file', INITIALIZING: 'Init…',
  ERROR: 'Échec deploy', CANCELED: 'Annulé', UNKNOWN: '—',
}

function Dot({ color }: { color: string }) {
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-tertiary)',
}

/** Bandeau santé + déploiement + avancement (n'affiche que ce qui est disponible). */
function StatusStrip({ status }: { status?: ProjectStatus }) {
  if (!status) return null
  const { health, deploy, advancement } = status

  const chips: React.ReactNode[] = []

  if (health.monitored) {
    chips.push(
      <span key="health" style={chipStyle}>
        <Dot color={health.ok ? '#22C55E' : '#EF4444'} />
        {health.ok ? `En ligne · ${health.latencyMs} ms` : 'Hors ligne'}
      </span>,
    )
  }

  if (deploy.configured) {
    chips.push(
      <span key="deploy" style={chipStyle}>
        <Dot color={DEPLOY_COLOR[deploy.state] ?? '#94A3B8'} />
        {DEPLOY_LABEL[deploy.state] ?? deploy.state}
        {deploy.createdAt ? ` · ${timeAgo(deploy.createdAt)}` : ''}
      </span>,
    )
  }

  if (advancement.available) {
    const { findings, tasks } = advancement
    if (findings.p0 > 0) {
      chips.push(<span key="p0" style={{ ...chipStyle, color: '#EF4444', fontWeight: 600 }}><Dot color="#EF4444" />{findings.p0} P0</span>)
    }
    if (findings.p1 > 0) {
      chips.push(<span key="p1" style={{ ...chipStyle, color: '#F59E0B' }}><Dot color="#F59E0B" />{findings.p1} P1</span>)
    }
    const totalTasks = tasks.open + tasks.done
    if (totalTasks > 0) {
      chips.push(<span key="todo" style={chipStyle}><Dot color="#818cf8" />TODO {tasks.done}/{totalTasks}</span>)
    }
  }

  if (chips.length === 0) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
      {chips}
    </div>
  )
}

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

function StatusPill({ project }: { project: ProjectDef }) {
  const color = project.status === 'production' ? '#22C55E'
    : project.status === 'build' ? '#F59E0B'
    : project.status === 'paused' ? '#94A3B8'
    : '#818cf8'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
      background: `${color}1a`, color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {PROJECT_STATUS_LABEL[project.status]}
    </span>
  )
}

function ProjectCard({ project, metrics, status }: {
  project: ProjectDef
  metrics: { key: string; value: number; unit: string; description: string }[]
  status?: ProjectStatus
}) {
  // Pick the most relevant metrics for each project
  const main = metrics?.[0]
  const secondary = metrics?.slice(1, 4) ?? []

  return (
    <Link
      href={projectHref(project.id)}
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--color-text)' }}>
                {project.name}
              </h3>
              <StatusPill project={project} />
            </div>
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

        {/* Santé + déploiement */}
        <StatusStrip status={status} />
      </div>
    </Link>
  )
}

export default async function HomePage() {
  let projectsMetrics: { project: string; metrics: { key: string; value: number; unit: string; description: string }[] }[] = []
  let statusMap: Record<string, ProjectStatus> = {}
  const [metricsRes, statusRes] = await Promise.allSettled([getAllMetrics(), getProjectsStatus()])
  if (metricsRes.status === 'fulfilled') {
    projectsMetrics = metricsRes.value.projects.map(p => ({ project: p.project, metrics: p.metrics }))
  }
  if (statusRes.status === 'fulfilled') {
    statusMap = statusRes.value
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
                status={statusMap[project.id]}
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
