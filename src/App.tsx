import { useState } from 'react'
import './App.css'

// Types
interface Project {
  id: string
  name: string
}

interface KPI {
  id: string
  name: string
  current: number
  target: number
  unit: string
  status: 'success' | 'warning' | 'critical'
}

// Mock Data
const projects: Project[] = [
  { id: '1', name: 'Amens' },
  { id: '2', name: 'FlashCert' },
  { id: '3', name: 'AgentCRM' },
  { id: '4', name: 'TeamGame' },
  { id: '5', name: 'Digital-DNA' },
  { id: '6', name: 'Fieat' },
  { id: '7', name: 'PhoneAutomation' },
]

const mockKPIs: KPI[] = [
  {
    id: '1',
    name: 'Vues totales',
    current: 823,
    target: 500,
    unit: 'vues',
    status: 'success',
  },
  {
    id: '2',
    name: 'Engagement Rate',
    current: 5.2,
    target: 5.0,
    unit: '%',
    status: 'success',
  },
  {
    id: '3',
    name: 'Clics/jour',
    current: 8,
    target: 10,
    unit: 'clics',
    status: 'warning',
  },
  {
    id: '4',
    name: 'Conversions',
    current: 2,
    target: 3,
    unit: 'inscriptions',
    status: 'warning',
  },
]

function App() {
  const [selectedProject, setSelectedProject] = useState<Project>(projects[0])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const getStatusIcon = (status: KPI['status']) => {
    switch (status) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'critical':
        return '❌'
    }
  }

  const getStatusClass = (status: KPI['status']) => {
    switch (status) {
      case 'success':
        return 'status-success'
      case 'warning':
        return 'status-warning'
      case 'critical':
        return 'status-critical'
    }
  }

  const getProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', color: '#FFFFFF' }}>
      {/* Desktop Menu */}
      <aside className="desktop-menu">
        <div style={{ padding: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 'bold', marginBottom: '2rem' }}>
            📊 Dash ◎{selectedProject.name}
          </h1>
          
          {/* Project Selector */}
          <select
            value={selectedProject.id}
            onChange={(e) => {
              const project = projects.find(p => p.id === e.target.value)
              if (project) setSelectedProject(project)
            }}
            style={{ 
              width: '100%', 
              backgroundColor: 'transparent', 
              border: '1px solid #222222', 
              borderRadius: '0.5rem', 
              padding: '0.5rem',
              color: '#FFFFFF',
              marginBottom: '2rem'
            }}
          >
            {projects.map(project => (
              <option key={project.id} value={project.id} style={{ backgroundColor: '#0A0A0A' }}>
                {project.name}
              </option>
            ))}
          </select>
          
          {/* Navigation */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="btn-nothing" style={{ textAlign: 'left' }}>🏠 Dashboard</button>
            <button className="btn-nothing" style={{ textAlign: 'left' }}>📈 Analytics</button>
            <button className="btn-nothing" style={{ textAlign: 'left' }}>📱 Marketing</button>
            <button className="btn-nothing" style={{ textAlign: 'left' }}>👥 Utilisateurs</button>
            <button className="btn-nothing" style={{ textAlign: 'left' }}>💰 Revenus</button>
            <button className="btn-nothing" style={{ textAlign: 'left' }}>⚙️ Paramètres</button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '16rem', padding: '1rem' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.25rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 'bold', marginBottom: '1.5rem' }}>
            Dashboard - Semaine 1
          </h2>
          
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {mockKPIs.map(kpi => (
              <div key={kpi.id} className="kpi-card">
                <div className="kpi-title">{kpi.name}</div>
                <div className="kpi-value">
                  {kpi.current} /{kpi.target} {kpi.unit}
                </div>
                <div className="progress-nothing">
                  <div 
                    className="progress-nothing-fill"
                    style={{ width: `${getProgress(kpi.current, kpi.target)}%` }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }} className={getStatusClass(kpi.status)}>
                  <span>
                    {kpi.current > kpi.target ? '+' : ''}
                    {(kpi.current - kpi.target).toFixed(1)}
                    {kpi.unit}
                  </span>
                  <span>{getStatusIcon(kpi.status)}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Network Stats */}
          <div className="card-nothing">
            <h3 style={{ fontSize: '1.125rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 'bold', marginBottom: '1rem' }}>
              Réseaux Sociaux
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="card-nothing">
                <div style={{ color: '#888888', fontSize: '0.875rem' }}>TikTok</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>356 vues</div>
                <div style={{ fontSize: '0.875rem', color: '#888888' }}>4.8% engagement</div>
              </div>
              <div className="card-nothing">
                <div style={{ color: '#888888', fontSize: '0.875rem' }}>Instagram</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>289 vues</div>
                <div style={{ fontSize: '0.875rem', color: '#888888' }}>5.6% engagement</div>
              </div>
              <div className="card-nothing">
                <div style={{ color: '#888888', fontSize: '0.875rem' }}>LinkedIn</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>178 impr.</div>
                <div style={{ fontSize: '0.875rem', color: '#888888' }}>3.2% engagement</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Menu */}
      <div className="mobile-menu">
        <button className="btn-nothing">🏠</button>
        <button className="btn-nothing">📈</button>
        <button className="btn-nothing">📱</button>
        <button 
          className="btn-nothing"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Project Selector */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#0A0A0A', zIndex: 50, padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 'bold' }}>Sélectionner Projet</h2>
            <button 
              className="btn-nothing"
              onClick={() => setMobileMenuOpen(false)}
            >
              ✕
            </button>
          </div>
          {projects.map(project => (
            <button
              key={project.id}
              className="btn-nothing"
              style={{ width: '100%', marginBottom: '0.5rem' }}
              onClick={() => {
                setSelectedProject(project)
                setMobileMenuOpen(false)
              }}
            >
              {project.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default App