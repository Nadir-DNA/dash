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
  { id: '3', label: 'Clics', value: 8, target: 10, unit: '' },
  { id: '4', label: 'Conversions', value: 2, target: 3, unit: '' },
]

const menuItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'users', label: 'Users' },
  { id: 'settings', label: 'Settings' },
]

// Glyph Matrix Font - Each digit as 3x5 grid
const GLYPH_DIGITS: { [key: string]: number[][] } = {
  '0': [
    [1,1,1],
    [1,0,1],
    [1,0,1],
    [1,0,1],
    [1,1,1],
  ],
  '1': [
    [0,1,0],
    [1,1,0],
    [0,1,0],
    [0,1,0],
    [1,1,1],
  ],
  '2': [
    [1,1,1],
    [0,0,1],
    [1,1,1],
    [1,0,0],
    [1,1,1],
  ],
  '3': [
    [1,1,1],
    [0,0,1],
    [1,1,1],
    [0,0,1],
    [1,1,1],
  ],
  '4': [
    [1,0,1],
    [1,0,1],
    [1,1,1],
    [0,0,1],
    [0,0,1],
  ],
  '5': [
    [1,1,1],
    [1,0,0],
    [1,1,1],
    [0,0,1],
    [1,1,1],
  ],
  '6': [
    [1,1,1],
    [1,0,0],
    [1,1,1],
    [1,0,1],
    [1,1,1],
  ],
  '7': [
    [1,1,1],
    [0,0,1],
    [0,0,1],
    [0,0,1],
    [0,0,1],
  ],
  '8': [
    [1,1,1],
    [1,0,1],
    [1,1,1],
    [1,0,1],
    [1,1,1],
  ],
  '9': [
    [1,1,1],
    [1,0,1],
    [1,1,1],
    [0,0,1],
    [1,1,1],
  ],
  '.': [
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,0,0],
    [0,1,0],
  ],
  '%': [
    [1,0,1],
    [0,0,1],
    [1,1,1],
    [1,0,0],
    [1,0,1],
  ],
}

// Menu icon patterns as 3x3 grids
const MENU_ICONS: { [key: string]: number[][] } = {
  dashboard: [
    [1,1,0],
    [1,0,0],
    [1,1,1],
  ],
  analytics: [
    [0,1,0],
    [0,1,0],
    [1,1,1],
  ],
  marketing: [
    [1,0,1],
    [0,1,0],
    [1,0,1],
  ],
  users: [
    [0,1,0],
    [1,1,1],
    [1,0,1],
  ],
  settings: [
    [1,0,1],
    [0,1,0],
    [1,0,1],
  ],
}

// Components
function GlyphDigit({ digit, size = 'md' }: { digit: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const pattern = GLYPH_DIGITS[digit] || GLYPH_DIGITS['0']
  const sizeClass = `glyph-digit glyph-digit-${size}`
  
  return (
    <div className={sizeClass}>
      {pattern.map((row, i) => 
        row.map((cell, j) => (
          <div key={`${i}-${j}`} className={`glyph-dot ${cell ? 'on' : ''}`} />
        ))
      )}
    </div>
  )
}

function GlyphNumber({ value, size = 'lg' }: { value: number | string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const digits = String(value).split('')
  
  return (
    <div className="glyph-number">
      {digits.map((digit, i) => (
        <GlyphDigit key={i} digit={digit} size={size} />
      ))}
    </div>
  )
}

function MenuIcon({ pattern }: { pattern: number[][] }) {
  return (
    <div className="menu-icon">
      {pattern.map((row, i) => 
        row.map((cell, j) => (
          <div key={`${i}-${j}`} className={`menu-icon-dot ${cell ? 'on' : ''}`} />
        ))
      )}
    </div>
  )
}

function GlyphProgressBar({ value, max, segments = 20 }: { value: number; max: number; segments?: number }) {
  const percentage = Math.min((value / max) * 100, 100)
  const filledSegments = Math.round((percentage / 100) * segments)
  
  return (
    <div className="glyph-progress-bar">
      {Array.from({ length: segments }).map((_, i) => (
        <div 
          key={i} 
          className={`glyph-bar-segment ${i < filledSegments ? 'filled' : ''}`}
          style={{ height: `${20 + Math.random() * 12}px` }}
        />
      ))}
    </div>
  )
}

function GlyphGrid({ dots, activeCount }: { dots: number; activeCount: number }) {
  const cols = Math.ceil(Math.sqrt(dots))
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '2px' }}>
      {Array.from({ length: dots }).map((_, i) => (
        <div 
          key={i} 
          className={`glyph-grid-dot ${i < activeCount ? 'on' : ''} ${i < activeCount ? 'breathing' : ''}`}
          style={{ animationDelay: `${i *0.05}s` }}
        />
      ))}
    </div>
  )
}

function App() {
  const [selectedProject, setSelectedProject] = useState<Project>(projects[0])
  const [activeMenu, setActiveMenu] = useState('dashboard')
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
    <div className="app-container">
      {/* Menu Sidebar */}
      <nav className="menu-sidebar">
        {menuItems.map(item => (
          <div
            key={item.id}
            className={`menu-item ${activeMenu === item.id ? 'active' : ''}`}
            onClick={() => setActiveMenu(item.id)}
          >
            <MenuIcon pattern={MENU_ICONS[item.id] || MENU_ICONS.dashboard} />
            <span className="menu-label">{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Glyph logo */}
              <div className="flex gap-1">
                {[1,0,1,1,1].map((d, i) => (
                  <div key={i} className={`glyph-grid-dot ${d ? 'on breathing' : ''}`} style={{ width: '8px', height: '8px' }} />
                ))}
              </div>
              <div className="section-title">DASH</div>
            </div>
            <select
              value={selectedProject.id}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value)
                if (project) setSelectedProject(project)
              }}
              className="glyph-selector"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Project name as Glyph */}
          <div style={{ 
            fontSize: '10px',
            letterSpacing: '0.1em',
            color: '#666666',
            textTransform: 'uppercase',
          }}>
            {activeMenu.toUpperCase()}
          </div>
        </header>

        {/* KPIs */}
        <section style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          <div className="section-header">
            <div className="section-dots">
              {[0,1,2].map(i => (
                <div key={i} className="section-dot" style={{ background: '#FFFFFF' }} />
              ))}
            </div>
            <span className="section-title">Métriques</span>
          </div>

          <div className="glyph-card">
            {kpis.map((kpi, index) => (
              <div key={kpi.id} className="flex gap-8 mb-8 last:mb-0" style={{ opacity: loaded ? 1 : 0, transition: `opacity 0.3s ease ${index * 0.1}s` }}>
                {/* Glyph visualization */}
                <div className="flex-shrink-0">
                  <GlyphGrid dots={30} activeCount={Math.round(getProgress(kpi.value, kpi.target) / 100 * 30)} />
                </div>
                
                {/* Value */}
                <div className="flex-1">
                  <div className="mb-2" style={{ fontSize: '10px', letterSpacing: '0.05em', color: '#666666', textTransform: 'uppercase' }}>
                    {kpi.label}
                  </div>
                  <div className="kpi-value">
                    <GlyphNumber value={kpi.value} size="lg" />
                    {kpi.unit && <span className="kpi-unit">{kpi.unit}</span>}
                  </div>
                  <div className="kpi-target mt-2">
                    Objectif: {kpi.target}{kpi.unit}
                  </div>
                  <div className="mt-4">
                    <GlyphProgressBar value={kpi.value} max={Math.max(kpi.value, kpi.target)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Overall Progress */}
        <section className="mt-8" style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease 0.3s' }}>
          <div className="section-header">
            <div className="section-dots">
              {[0,1].map(i => (
                <div key={i} className="section-dot" style={{ background: '#FFFFFF' }} />
              ))}
            </div>
            <span className="section-title">Progression</span>
          </div>

          <div className="glyph-card">
            <div className="flex items-center justify-between mb-4">
              <div style={{ fontSize: '10px', color: '#666666', letterSpacing: '0.05em' }}>
                OBJECTIFS ATTEINTS
              </div>
              <GlyphNumber value={Math.round(getTotalProgress())} size="md" />
              <span style={{ fontSize: '16px', color: '#666666' }}>%</span>
            </div>
            <GlyphProgressBar value={getTotalProgress()} max={100} segments={30} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App