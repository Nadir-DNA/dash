import { useState, useEffect } from 'react'
import { useMetrics } from './hooks/useMetrics'
import { DEFAULT_PROJECTS } from './types/metrics'

// Glyph Matrix Font - Each digit as 3x5 grid
const DIGIT_PATTERNS: { [key: string]: number[][] } = {
  '0': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
  '2': [[0,1,0],[1,0,1],[0,0,1],[1,0,0],[1,1,1]],
  '3': [[1,1,0],[0,0,1],[0,1,0],[0,0,1],[1,1,0]],
  '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
  '5': [[1,1,1],[1,0,0],[1,1,0],[0,0,1],[1,1,0]],
  '6': [[0,1,0],[1,0,0],[1,1,1],[1,0,1],[0,1,0]],
  '7': [[1,1,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0]],
  '8': [[0,1,0],[1,0,1],[0,1,0],[1,0,1],[0,1,0]],
  '9': [[0,1,0],[1,0,1],[0,1,1],[0,0,1],[0,1,0]],
  '.': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,1,0]],
  '%': [[1,0,1],[0,0,1],[0,1,0],[1,0,0],[1,0,1]],
  '/': [[0,0,1],[0,0,1],[0,1,0],[1,0,0],[1,0,0]],
  ',': [[0,0,0],[0,0,0],[0,0,0],[0,1,0],[1,0,0]],
  '€': [[0,0,1],[0,1,1],[1,0,0],[0,1,1],[0,0,1]],
  'K': [[1,0,1],[1,1,0],[1,0,0],[1,1,0],[1,0,1]],
}

const MENU_ICONS: { [key: string]: number[][] } = {
  dashboard: [[1,1,0],[1,0,0],[1,1,1]],
  analytics: [[0,1,0],[0,1,0],[1,1,1]],
  marketing: [[1,0,1],[0,1,0],[1,0,1]],
  users: [[0,1,0],[1,1,1],[1,0,1]],
  settings: [[1,0,1],[0,1,0],[1,0,1]],
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'users', label: 'Users' },
  { id: 'settings', label: 'Settings' },
]

// Components
function GlyphDigit({ digit, size = 'md' }: { digit: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const pattern = DIGIT_PATTERNS[digit] || DIGIT_PATTERNS['0']
  const sizeClass = `glyph-digit-grid glyph-digit-${size}`
  
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
  const formatted = typeof value === 'number' ? value.toLocaleString('fr-FR') : String(value)
  const digits = formatted.split('')
  return (
    <div className="glyph-number">
      {digits.map((d, i) => (
        <GlyphDigit key={i} digit={d} size={size} />
      ))}
    </div>
  )
}

function GlyphCircle({ percentage, size = 140 }: { percentage: number; size?: number }) {
  const dots =24
  const activeDots = Math.round((percentage / 100) * dots)
  const radius = size / 2 - 15
  
  return (
    <div className="glyph-circle" style={{ width: size, height: size }}>
      {Array.from({ length: dots }).map((_, i) => {
        const angle = (i / dots) * 2 * Math.PI - Math.PI /2
        const x = size / 2 + radius * Math.cos(angle)
        const y = size / 2 + radius * Math.sin(angle)
        return (
          <div
            key={i}
            className={`glyph-grid-dot ${i < activeDots ? 'on' : ''}`}
            style={{
              position: 'absolute',
              left: x - 4,
              top: y - 4,
              width: 6,
              height: 6,
              animation: i < activeDots ? `breathe 2s ease-in-out ${i * 0.05}s infinite` : 'none',
            }}
          />
        )
      })}
      <div className="glyph-circle-center">
        <GlyphNumber value={Math.round(percentage)} size="sm" />
      </div>
    </div>
  )
}

function GlyphGauge({ percentage, segments = 30 }: { percentage: number; segments?: number }) {
  const activeDots = Math.round((percentage / 100) * segments)
  return (
    <div className="glyph-gauge">
      {Array.from({ length: segments }).map((_, i) => (
        <div key={i} className={`glyph-gauge-segment ${i < activeDots ? 'on' : ''}`} />
      ))}
    </div>
  )
}

function GlyphLineChart({ data }: { data: { label: string; value: number }[] }) {
  const rows = 10
  const cols = data.length
  const maxVal = Math.max(...data.map(d => d.value))
  const normalizedData = data.map(d => Math.round((d.value / maxVal) * (rows - 1)))
  
  return (
    <div className="glyph-line-chart">
      <div className="glyph-line-grid">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="glyph-line-row">
            {Array.from({ length: cols }).map((_, col) => {
              const value = normalizedData[col]
              const isActive = row === rows - 1 - value
              const isOn = row <= rows - 1 - value
              return (
                <div 
                  key={col} 
                  className={`glyph-line-dot ${isActive ? 'active' : isOn ? 'on' : ''}`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function GlyphGrid({ count, active }: { count: number; active: number }) {
  const cols = Math.ceil(Math.sqrt(count))
  return (
    <div className="glyph-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={`glyph-grid-dot ${i < active ? 'on' : ''}`}style={{ animation: i < active ? `breathe 2s ease-in-out ${i * 0.02}s infinite` : 'none' }}
        />
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

function MetricCard({ 
  label, 
  value, 
  unit, 
  percentage 
}: { 
  label: string
  value: number
  unit: string
  percentage: number 
}) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{label}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GlyphCircle percentage={percentage} size={120} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
        <GlyphNumber value={value} size="md" />
        <span className="text-label">{unit}</span>
      </div>
    </div>
  )
}

function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [selectedProject, setSelectedProject] = useState(DEFAULT_PROJECTS[0])
  const [loaded, setLoaded] = useState(false)
  
  const { metrics, visitsData, getMetricCards, getRevenueCards, getEngagementCards } = useMetrics(selectedProject.id)

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100)
  }, [])

  const metricCards = getMetricCards()
  const revenueCards = getRevenueCards()
  const engagementCards = getEngagementCards()

  return (
    <div className="dashboard">
      {/* Menu */}
      <nav className="menu">
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
      <main className="main">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <GlyphGrid count={15} active={10} />
            <span className="header-title">DASHBOARD</span>
          </div>
          <select
            value={selectedProject.id}
            onChange={(e) => {
              const project = DEFAULT_PROJECTS.find(p => p.id === e.target.value)
              if (project) setSelectedProject(project)
            }}
            className="selector"
          >
            {DEFAULT_PROJECTS.map(project => (
              <option key={project.id} value={project.id}>
                {project.icon} {project.name}
              </option>
            ))}
          </select>
        </header>

        {/* Main KPIs */}
        <section style={{ marginBottom: '32px' }}>
          <div className="kpi-grid">
            {metricCards.map((card, index) => (
              <div 
                key={card.id} 
                style={{ opacity: loaded ? 1 : 0, transition: `opacity 0.3s ease ${index * 0.1}s` }}
              >
                <MetricCard 
                  label={card.label}
                  value={card.value}
                  unit={card.unit}
                  percentage={card.changePercent || 50}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Revenue & Engagement */}
        <section style={{ marginBottom: '32px' }}>
          <div className="charts-grid">
            {/* Revenue */}
            <div className="card" style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease 0.4s' }}>
              <div className="card-header">
                <span className="card-title">Revenus</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
                {revenueCards.map(card => (
                  <div key={card.id} style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <GlyphNumber value={card.value} size="sm" />
                      <span style={{ fontSize: '10px', color: '#666666', marginLeft: '4px' }}>{card.unit}</span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <GlyphGauge percentage={Math.abs(card.changePercent || 0)} segments={20} />
                    </div>
                    <span style={{ fontSize: '10px', color: '#666666' }}>{card.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '24px' }}>
                <GlyphLineChart data={visitsData.map(d => ({ label: d.date.slice(5), value: d.value }))} />
              </div>
            </div>

            {/* Engagement */}
            <div className="card" style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease 0.5s' }}>
              <div className="card-header">
                <span className="card-title">Engagement</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                {engagementCards.map(card => (
                  <div key={card.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#666666', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {card.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <GlyphGauge percentage={card.trend === 'up' ? Math.abs(card.changePercent || 0) : 100 - (card.changePercent || 0)} segments={15} />
                      <GlyphNumber value={card.value} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                <GlyphGrid count={40} active={metrics ? Math.round((metrics.dau / metrics.mau) * 40) : 20} />
              </div>
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '10px', color: '#666666' }}>DAU / MAU</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App