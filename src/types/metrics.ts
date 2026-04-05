// Types for Dash metrics

export interface ProjectMetrics {
  id: string
  name: string
  icon: string
  
  // Acquisition
  visits: number
  pageViews: number
  uniqueVisitors: number
  
  // Conversion
  conversionRate: number
  signups: number
  subscribers: number
  
  // Engagement
  avgSessionDuration: number // seconds
  pagesPerSession: number
  bounceRate: number
  
  // Revenue (for SaaS)
  mrr?: number
  arpu?: number
  ltv?: number
  churnRate?: number
  
  // Active users
  dau: number
  mau: number
  
  // Custom for marketplace
  listings?: number
  transactions?: number
  sellers?: number
  buyers?: number
}

export interface TimeSeriesData {
  date: string
  value: number
}

export interface ChartData {
  label: string
  value: number
  color?: string
}

export interface MetricCard {
  id: string
  label: string
  value: number
  previousValue?: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  changePercent?: number
}

// Default metrics for Amens SaaS Marketplace
export const DEFAULT_PROJECTS: ProjectMetrics[] = [
  {
    id: 'amens',
    name: 'Amens',
    icon: '🏠',
    visits: 8542,
    pageViews: 23456,
    uniqueVisitors: 6890,
    conversionRate: 3.2,
    signups: 274,
    subscribers: 152,
    avgSessionDuration: 245,
    pagesPerSession: 2.8,
    bounceRate: 42,
    mrr: 4500,
    arpu: 29.60,
    ltv: 355,
    churnRate: 2.1,
    dau: 89,
    mau: 412,
    listings: 234,
    transactions: 67,
    sellers: 45,
    buyers: 189,
  },
  {
    id: 'flashcert',
    name: 'FlashCert',
    icon: '🎓',
    visits: 3421,
    pageViews: 8934,
    uniqueVisitors: 2100,
    conversionRate: 4.8,
    signups: 164,
    subscribers: 89,
    avgSessionDuration: 312,
    pagesPerSession: 2.6,
    bounceRate: 38,
    mrr: 2800,
    arpu: 31.50,
    ltv: 420,
    churnRate: 1.8,
    dau: 56,
    mau: 234,
  },
  {
    id: 'agentcrm',
    name: 'AgentCRM',
    icon: '👥',
    visits: 5621,
    pageViews: 15678,
    uniqueVisitors: 4120,
    conversionRate: 2.1,
    signups: 118,
    subscribers: 67,
    avgSessionDuration: 189,
    pagesPerSession: 2.4,
    bounceRate: 51,
    mrr: 1890,
    arpu: 28.20,
    ltv: 310,
    churnRate: 3.2,
    dau: 34,
    mau: 156,
  },
]

// Time series data generator (mock)
export function generateTimeSeriesData(days: number = 7, baseValue: number = 100): TimeSeriesData[] {
  const data: TimeSeriesData[] = []
  const today = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const variance = Math.random() * 0.4 - 0.2 // -20% to +20%
    const value = Math.round(baseValue * (1 + variance))
    data.push({
      date: date.toISOString().split('T')[0],
      value,
    })
  }
  
  return data
}

// Chart colors for consistency
export const CHART_COLORS = {
  primary: '#FFFFFF',
  secondary: '#666666',
  accent: '#FF5733',
  success: '#00D26A',
  warning: '#FFB800',
}