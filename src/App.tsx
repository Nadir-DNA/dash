import { useState, useEffect } from 'react'

// Types
interface Project {
  id: string
  name: string
}

interface KPI {
  id: string
  label: string
  value: number
  target: number
  unit: string
}

interface Network {
  name: string
  views: number
  engagement: number
}

// Data
const projects: Project[] = [
  { id: '1', name: 'Amens' },
  { id: '2', name: 'FlashCert' },
  { id: '3', name: 'AgentCRM' },
  { id: '4', name: 'TeamGame' },
  { id: '5', name: 'Digital-DNA' },
  { id: '6', name: 'Fieat' },
  { id: '7', name: 'PhoneAutomation' },
]

const kpis: KPI[] = [
  { id: '1', label: 'Vues', value: 823, target: 500, unit: '' },
  { id: '2', label: 'Engagement', value: 5.2, target: 5.0, unit: '%' },
  { id: '3', label: 'Clics/jour', value: 8, target: 10, unit: '' },
  { id: '4', label: 'Conversions', value: 2, target: 3, unit: '' },
]

const networks: Network[] = [
  { name: 'TikTok', views: 356, engagement: 4.8 },
  { name: 'Instagram', views: 289, engagement: 5.6 },
  { name: 'LinkedIn', views: 178, engagement: 3.2 },
]

// Glyph Components
function GlyphProgress({ value, max, segments =20 }: { value: number; max: number; segments?: number }) {
  const percentage = Math.min((value / max) * 100, 100)
  const filledSegments = Math.floor((percentage / 100) * segments)
  const partialFill = ((percentage / 100) * segments) % 1

  return (
    <div className="glyph-progress">
      {Array.from({ length: segments }).map((_, i) => {
        let fillClass = ''
        if (i < filledSegments) {
          fillClass = 'filled'
        } else if (i === filledSegments && partialFill > 0) {
          fillClass = 'partial'
        }
        return <div key={i} className={`glyph-segment ${fillClass}`} />
      })}
    </div>
  )
}

function GlyphDots({ count, active, breathing = false }: { count: number; active: number; breathing?: boolean }) {
  return (
    <div className="glyph-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={`glyph-dot ${i < active ? 'active' : ''} ${breathing && i < active ? 'breathing' : ''}`}
        />
      ))}
    </div>
  )
}

function GlyphBar({ percentage }: { percentage: number }) {
  return (
    <div className="glyph-bar">
      <div className="glyph-bar-fill" style={{ width: `${Math.min(percentage, 100)}%` }} />
    </div>
  )
}

function App() {
  const [selectedProject, setSelectedProject] = useState<Project>(projects[0])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100)
  }, [])

  const getProgress = (value: number, target: number) => {
    return Math.min((value / target) * 100, 100)
  }

  const getTotalProgress = () => {
    const progresses = kpis.map(kpi => getProgress(kpi.value, kpi.target))
    return progresses.reduce((a, b) => a + b, 0) / progresses.length
  }

  return (
    <div className="screen">
      {/* Header */}
      <header className="header">
        <div>
          <div className="text-micro mb-2">Projet</div>
          <select
            value={selectedProject.id}
            onChange={(e) => {
              const project = projects.find(p => p.id === e.target.value)
              if (project) setSelectedProject(project)
            }}
            className="select-glyph"
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="text-micro">
          Sprint 1
        </div>
      </header>

      {/* Main KPIs */}
      <section>
        <div className="section-title">Métriques</div>
        <div className="kpi-grid">
          {kpis.map((kpi, index) => (
            <div 
              key={kpi.id} 
              className="card-glyph"
              style={{ opacity: loaded ? 1 : 0, transition: `opacity 0.3s ease ${index *0.1}s` }}
            >
              <div className="kpi-item">
                {/* Visual - Glyph Progress */}
                <div className="kpi-visual">
                  <GlyphProgress value={kpi.value} max={Math.max(kpi.value, kpi.target)} segments={15} />
                </div>
                
                {/* Data */}
                <div className="kpi-data">
                  <div className="text-label mb-1">{kpi.label}</div>
                  <div className="text-value">
                    {kpi.value.toLocaleString()}{kpi.unit}
                  </div>
                  <div className="text-micro mt-2">
                    Objectif: {kpi.target}{kpi.unit}
                  </div>
                  <div className="mt-3">
                    <GlyphBar percentage={getProgress(kpi.value, kpi.target)} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* Overall Progress */}
      <section>
        <div className="section-title">Progression globale</div>
        <div className="card-glyph" style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease 0.4s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-micro">Objectifs atteints</div>
            <div className="text-value" style={{ fontSize: '24px' }}>
              {Math.round(getTotalProgress())}%
            </div>
          </div>
          <GlyphBar percentage={getTotalProgress()} />
          <div className="flex justify-center mt-6">
            <GlyphDots count={20} active={Math.round(getTotalProgress() /5)} breathing />
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* Networks */}
      <section>
        <div className="section-title">Réseaux</div>
        <div className="network-grid">
          {networks.map((network, index) => (
            <div 
              key={network.name}
              className="card-glyph"
              style={{ opacity: loaded ? 1 : 0, transition: `opacity 0.3s ease ${0.5 + index * 0.1}s` }}
            >
              <div className="text-micro mb-3">{network.name}</div>
              <div className="flex justify-center mb-4">
                <GlyphDots count={10} active={Math.min(Math.round(network.views / 50), 10)} />
              </div>
              <div className="text-value mb-1" style={{ fontSize: '24px' }}>
                {network.views}
              </div>
              <div className="text-label">vues</div>
              <div className="mt-2">
                <GlyphBar percentage={network.engagement * 20} />
              </div>
              <div className="text-micro mt-2">{network.engagement}% engagement</div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* Status */}
      <section>
        <div className="section-title">Statut</div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="status-dot active" />
            <span className="text-label">En cours</span>
          </div>
          <div className="text-micro">
            Mis à jour maintenant
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', paddingTop: '48px' }}>
        <div className="flex justify-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="status-dot active" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
        <div className="text-micro text-center mt-4">
          Dash◎
        </div>
      </footer>
    </div>
  )
}

export default App