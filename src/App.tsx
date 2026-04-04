import { useState, useEffect } from 'react'

// Types
interface KPI {
  id: string
  label: string
  value: number
  target: number
  unit: string
  percentage: number
}

interface ChartData {
  label: string
  value: number
}

// Data
const kpis: KPI[] = [
  { id: '1', label: 'Vues', value: 823, target: 500, unit: '', percentage: 165 },
  { id: '2', label: 'Engagement', value: 5.2, target: 5.0, unit: '%', percentage: 104 },
  { id: '3', label: 'Clics/jour', value: 8, target: 10, unit: '', percentage: 80 },
  { id: '4', label: 'Conversions', value: 2, target: 3, unit: '', percentage: 67 },
]

const chartData: ChartData[] = [
  { label: 'Lun', value: 120 },
  { label: 'Mar', value: 180 },
  { label: 'Mer', value: 150 },
  { label: 'Jeu', value: 220 },
  { label: 'Ven', value: 280 },
  { label: 'Sam', value: 350 },
  { label: 'Dim', value: 410 },
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

// Glyph Menu Icons (3x3 grid patterns)
const MENU_ICONS: { [key: string]: number[][] } = {
  dashboard: [[1,1,0],[1,0,0],[1,1,1]],
  analytics: [[0,1,0],[0,1,0],[1,1,1]],
  marketing: [[1,0,1],[0,1,0],[1,0,1]],
  users: [[0,1,0],[1,1,1],[1,0,1]],
  settings: [[1,0,1],[0,1,0],[1,0,1]],
}

// Components
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

function GlyphDots({ count, active }: { count: number; active: number }) {
  const cols = Math.ceil(Math.sqrt(count))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '3px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={`glyph-dot ${i < active ? 'on breathing' : ''}`}
          style={{ width: '5px', height: '5px', animationDelay: `${i * 0.05}s` }}
        />
      ))}
    </div>
  )
}

function CircularProgress({ value, max }: { value: number; max: number }) {
  const percentage = Math.min((value / max) * 100, 100)
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="circle-progress">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <circle
          className="circle-bg"
          cx="60"
          cy="60"
          r={radius}
          strokeWidth="4"
        />
        <circle
          className="circle-fill"
          cx="60"
          cy="60"
          r={radius}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
      </svg>
      <div className="circle-center">
        <div className="circle-value">{value}</div>
        <div className="circle-label">/ {max}</div>
      </div>
    </div>
  )
}

function LineChart({ data }: { data: ChartData[] }) {
  const maxValue = Math.max(...data.map(d => d.value))
  const height = 160
  const width = 400
  const padding = 20

  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / (data.length - 1)
    const y = height - padding - ((d.value / maxValue) * (height - padding * 2))
    return { x, y, value: d.value, label: d.label }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <div className="line-chart">
      <div className="line-chart-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid-line" />
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="line-chart-area" d={areaD} />
        <path className="line-chart-line" d={pathD} />
        {points.map((p, i) => (
          <circle
            key={i}
            className="line-chart-dots"
            cx={p.x}
            cy={p.y}
            r="3"
          />
        ))}
      </svg>
      <div className="line-chart-labels">
        {data.map((d, i) => (
          <div key={i} className="line-chart-label">{d.label}</div>
        ))}
      </div>
    </div>
  )
}

function GaugeBar({ percentage }: { percentage: number }) {
  return (
    <div className="gauge-chart">
      <div className="gauge-fill" style={{ width: `${Math.min(percentage, 100)}%` }} />
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

  const totalProgress = kpis.reduce((acc, kpi) => acc + kpi.percentage, 0) / kpis.length

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
            <div className="flex gap-1">
              {[1,0,1,1,1].map((d, i) => (
                <div 
                  key={i} 
                  className={`glyph-dot ${d ? 'on breathing' : ''}`}
                  style={{ width: '6px', height: '6px', animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <span className="header-title">DASHBOARD</span>
          </div>
          <select
            value={selectedProject.id}
            onChange={(e) => {
              const project = projects.find(p => p.id === e.target.value)
              if (project) setSelectedProject(project)
            }}
            className="project-selector"
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </header>

        {/* KPIs with Circular Progress */}
        <section className="section">
          <div className="kpi-grid">
            {kpis.map((kpi, index) => (
              <div 
                key={kpi.id} 
                className="kpi-card"
                style={{ opacity: loaded ? 1 : 0, transition: `opacity 0.3s ease ${index * 0.1}s` }}
              >
                <div className="kpi-label">{kpi.label}</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress value={kpi.value} max={Math.max(kpi.value, kpi.target)} />
                </div>
                <div className="kpi-target">Objectif: {kpi.target}{kpi.unit}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Charts */}
        <section className="section">
          <div className="charts-grid">
            {/* Line Chart */}
            <div 
              className="chart-card"
              style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease 0.4s' }}
            >
              <div className="chart-header">
                <div className="chart-title">Évolution hebdomadaire</div>
                <div className="chart-value">+64%</div>
              </div>
              <LineChart data={chartData} />
            </div>

            {/* Total Progress */}
            <div 
              className="chart-card"
              style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease 0.5s' }}
            >
              <div className="chart-header">
                <div className="chart-title">Progression globale</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', fontWeight: 200, marginBottom: '8px' }}>
                      {Math.round(totalProgress)}%
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                      <GlyphDots count={25} active={Math.round(totalProgress /4)} />
                    </div>
                  </div>
                </div>
                {kpis.map(kpi => (
                  <div key={kpi.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#666666' }}>
                        {kpi.label}
                      </span>
                      <span style={{ fontSize: '10px', color: '#666666' }}>
                        {kpi.percentage}%
                      </span>
                    </div>
                    <GaugeBar percentage={kpi.percentage} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App