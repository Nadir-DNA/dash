import { getProjectIcon } from '../lib/metrics'

export function ProjectTab({ id, name, accent, active, onClick, status }: {
  id: string
  name: string
  accent: string
  active: boolean
  onClick: () => void
  status: 'active' | 'empty' | 'error'
}) {
  return (
    <button className={`project-tab ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="project-tab-dot" style={{ background: status === 'active' ? accent : 'var(--text-tertiary)' }} />
      {getProjectIcon(id)} {name}
    </button>
  )
}
