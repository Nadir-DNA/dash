import { useState } from 'react'

// Types
interface Project {
  id: string
  name: string
  icon: string
}

interface KPI {
  id: string
  label: string
  value: number
  target: number
  unit: string
  delta: number
  trend: 'up' | 'down' | 'stable'
}

interface NetworkStat {
  name: string
  icon: string
  views: number
  engagement: number
  color: string
}

// Data
const projects: Project[] = [
  { id: '1', name: 'Amens', icon: '🏠' },
  { id: '2', name: 'FlashCert', icon: '🎓' },
  { id: '3', name: 'AgentCRM', icon: '👥' },
  { id: '4', name: 'TeamGame', icon: '🎮' },
  { id: '5', name: 'Digital-DNA', icon: '🧬' },
  { id: '6', name: 'Fieat', icon: '💰' },
  { id: '7', name: 'PhoneAutomation', icon: '📱' },
]

const kpis: KPI[] = [
  {
    id: '1',
    label: 'Vues totales',
    value: 823,
    target: 500,
    unit: 'vues',
    delta: 64.6,
    trend: 'up',
  },
  {
    id: '2',
    label: 'Taux d\'engagement',
    value: 5.2,
    target: 5.0,
    unit: '%',
    delta: 4.0,
    trend: 'up',
  },
  {
    id: '3',
    label: 'Clics par jour',
    value: 8,
    target: 10,
    unit: 'clics',
    delta: -20.0,
    trend: 'down',
  },
  {
    id: '4',
    label: 'Conversions',
    value: 2,
    target: 3,
    unit: 'inscriptions',
    delta: -33.3,
    trend: 'down',
  },
]

const networkStats: NetworkStat[] = [
  { name: 'TikTok', icon: '📱', views: 356, engagement: 4.8, color: '#FF5733' },
  { name: 'Instagram', icon: '📷', views: 289, engagement: 5.6, color: '#3B82F6' },
  { name: 'LinkedIn', icon: '💼', views: 178, engagement: 3.2, color: '#00D26A' },
]

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'marketing', label: 'Marketing', icon: '📱' },
  { id: 'users', label: 'Utilisateurs', icon: '👥' },
  { id: 'revenue', label: 'Revenus', icon: '💰' },
  { id: 'settings', label: 'Paramètres', icon: '⚙️' },
]

function App() {
  const [selectedProject, setSelectedProject] = useState<Project>(projects[0])
  const [activeMenu, setActiveMenu] = useState('dashboard')

  const getProgress = (current: number, target: number) => {
    return Math.min(Math.max((current / target) * 100, 0), 100)
  }

  return (
    <div className="min-h-screen bg-rien-black text-rien-white">
      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar fixedleft-0 top-0 bottom-0 w-64 bg-rien-dark border-r border-rien-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-rien-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rien-accent to-rien-warning flex items-center justify-center text-black font-bold text-sm">
              D
            </div>
            <span className="text-lg font-semibold tracking-tight">Dash</span>
          </div>
        </div>

        {/* Project Selector */}
        <div className="p-4 border-b border-rien-border">
          <select
            value={selectedProject.id}
            onChange={(e) => {
              const project = projects.find(p => p.id === e.target.value)
              if (project) setSelectedProject(project)
            }}
            className="select-dark w-full"
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.icon} {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`btn w-full flex items-center gap-3 ${activeMenu === item.id ? 'btn-active' : ''}`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-rien-border">
          <div className="flex items-center gap-3 text-sm text-rien-gray">
            <div className="w-8 h-8 rounded-full bg-rien-elevated flex items-center justify-center">
              N
            </div>
            <span>Nadir DNA</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 bg-rien-black/80 backdrop-blur-xl border-b border-rien-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {selectedProject.icon} {selectedProject.name}
              </h1>
              <p className="text-sm text-rien-gray mt-1">
                Semaine 1•{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn text-sm">
                📅 7 jours
              </button>
              <button className="btn text-sm">
                ↻ Actualiser
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* KPI Grid */}
          <section>
            <div className="grid-metrics">
              {kpis.map(kpi => (
                <div key={kpi.id} className="kpi-card">
                  <div className="flex items-start justify-between mb-4">
                    <span className="metric-label">{kpi.label}</span>
                    {kpi.trend === 'up' ? (
                      <span className="badge-success">
                        ↑ {kpi.delta.toFixed(1)}%
                      </span>
                    ) : kpi.trend === 'down' ? (
                      <span className="badge-warning">
                        ↓ {Math.abs(kpi.delta).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-rien-gray text-xs">—</span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="metric-value">{kpi.value.toLocaleString()}</span>
                    <span className="text-rien-gray text-sm">/ {kpi.target} {kpi.unit}</span>
                  </div>
                  
                  <div className="progress">
                    <div 
                      className="progress-fill"
                      style={{ width: `${getProgress(kpi.value, kpi.target)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Network Stats */}
          <section>
            <h2 className="text-lg font-semibold mb-4 tracking-tight">
              Réseaux Sociaux
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {networkStats.map(stat => (
                <div key={stat.name} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{stat.icon}</span>
                      <span className="font-medium">{stat.name}</span>
                    </div>
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stat.color }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="text-2xl font-bold">{stat.views.toLocaleString()}</div>
                      <div className="text-xs text-rien-gray">vues</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{stat.engagement}%</div>
                      <div className="text-xs text-rien-gray">engagement</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Global Progress */}
          <section>
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold tracking-tight">Progression globale</h2>
                <span className="text-rien-gray text-sm">67% des objectifs</span>
              </div>
              <div className="h-2 bg-rien-surface rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rien-accent to-rien-warning rounded-full" style={{ width: '67%' }} />
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="mobile-bottom-bar fixed bottom-0 left-0 right-0 bg-rien-dark border-t border-rien-border px-2 py-3">
        {menuItems.slice(0, 5).map(item => (
          <button
            key={item.id}
            onClick={() => setActiveMenu(item.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-1 ${activeMenu === item.id ? 'text-rien-accent' : 'text-rien-gray'}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-2xs">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App