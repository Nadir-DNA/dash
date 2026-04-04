import { useState, useEffect } from 'react'

// Types
interface KPI {
  id: string
  label: string
  value: number
  target: number
  unit: string
}

interface ChartData {
  label: string
  value: number
}

// Data
const kpis: KPI[] = [
  { id: '1', label: 'Vues', value: 823, target: 500, unit: '' },
  { id: '2', label: 'Engagement', value: 5.2, target: 5.0, unit: '%' },
  { id: '3', label: 'Clics', value: 8, target: 10, unit: '' },
  { id: '4', label: 'Conversions', value: 2, target: 3, unit: '' },
]

const chartData: ChartData[] = [
  { label: 'L', value: 120 },
  { label: 'M', value: 180 },
  { label: 'M', value: 150 },
  { label: 'J', value: 220 },
  { label: 'V', value: 280 },
  { label: 'S', value: 350 },
  { label: 'D', value: 410 },
]

const menuItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'users', label: 'Users' },
  { id: 'settings', label: 'Settings' },
]

const projects = [
  { id: '1', name: 'Amens' },
  { id: '2', name: 'FlashCert' },
  { id: '3', name: 'AgentCRM' },
]

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
}

const MENU_ICONS: { [key: string]: number[][] } = {
  dashboard: [[1,1,0],[1,0,0],[1,1,1]],
  analytics: [[0,1,0],[0,1,0],[1,1,1]],
  marketing: [[1,0,1],[0,1,0],[1,0,1]],
  users: [[0,1,0],[1,1,1],[1,0,1]],
  settings: [[1,0,1],[0,1,0],[1,0,1]],
}

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
  const digits = String(value).split('')
  return (
    <div className="glyph-number">
      {digits.map((d, i) => (
        <GlyphDigit key={i} digit={d} size={size} />
      ))}
    </div>
  )
}

function GlyphCircle({ percentage, size = 160 }: { percentage: number; size?: number }) {
  const dots = 24
  const activeDots = Math.round((percentage / 100) * dots)
  const radius = size / 2 - 15
  
  return (
    <div className="glyph-circle" style={{ width: size, height: size }}>
      {Array.from({ length: dots }).map((_, i) => {
        const angle = (i / dots) * 2 * Math.PI - Math.PI / 2
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
        <GlyphNumber value={Math.round(percentage)} size="md" />
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

function GlyphLineChart({ data }: { data: ChartData[] }) {
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
          className={`glyph-grid-dot ${i < active ? 'on' : ''}`}
          style={{ animation: i < active ? `breathe 2s ease-in-out ${i * 0.02}s infinite` : 'none' }}
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

function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [selectedProject, setSelectedProject] = useState(projects[0])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100)
  }, [])

  const getPercentage = (value: number, target: number) => Math.round((value / target) * 100)
  const totalProgress = kpis.reduce((acc, kpi) => acc + getPercentage(kpi.value, kpi.target), 0) / kpis.length

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
              const project = projects.find(p => p.id === e.target.value)
              if (project) setSelectedProject(project)
            }}
            className="selector"
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </header>

        {/* KPIs - Circular Progress */}
        <div className="kpi-grid">
          {kpis.map((kpi, index) => (
            <div 
              key={kpi.id} 
              className="card"
              style={{ opacity: loaded ? 1 : 0, transition: `opacity 0.3s ease ${index * 0.1}s` }}
            >
              <div className="card-header">
                <span className="card-title">{kpi.label}</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GlyphCircle percentage={getPercentage(kpi.value, kpi.target)} size={140} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <GlyphNumber value={kpi.value} size="md" />
                <span className="text-label">/ {kpi.target}{kpi.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="charts-grid">
          {/* Line Chart */}
          <div className="card" style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease 0.4s' }}>
            <div className="card-header">
              <span className="card-title">Évolution</span>
              <span className="text-label">+64%</span>
            </div>
            <GlyphLineChart data={chartData} />
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '12px' }}>
              {chartData.map((d, i) => (
                <span key={i} className="text-micro">{d.label}</span>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="card" style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease 0.5s' }}>
            <div className="card-header">
              <span className="card-title">Progression</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', flex: 1 }}>
              <GlyphCircle percentage={totalProgress} size={120} />
              <div style={{ textAlign: 'center' }}>
                <GlyphNumber value={Math.round(totalProgress)} size="lg" />
                <span className="text-label">%</span>
              </div>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <GlyphGrid count={50} active={Math.round(totalProgress / 2)} />
              </div>
            </div>
            <div style={{ marginTop: '24px' }}>
              {kpis.map(kpi => (
                <div key={kpi.id} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="text-micro">{kpi.label}</span>
                    <span className="text-label">{getPercentage(kpi.value, kpi.target)}%</span>
                  </div>
                  <GlyphGauge percentage={getPercentage(kpi.value, kpi.target)} segments={40} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App