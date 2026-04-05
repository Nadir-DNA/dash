import { useState, useEffect } from 'react'
import type { ProjectMetrics, MetricCard, TimeSeriesData } from '../types/metrics'
import { generateTimeSeriesData, DEFAULT_PROJECTS } from '../types/metrics'

// Supabase configuration (to be filled with real credentials)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export function useMetrics(projectId: string = 'amens') {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null)
  const [visitsData, setVisitsData] = useState<TimeSeriesData[]>([])
  const [signupsData, setSignupsData] = useState<TimeSeriesData[]>([])
  const [revenueData, setRevenueData] = useState<TimeSeriesData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // For now, use mock data
    // TODO: Replace with Supabase queries when credentials are provided
    const project = DEFAULT_PROJECTS.find(p => p.id === projectId)
    
    if (project) {
      setMetrics(project)
      setVisitsData(generateTimeSeriesData(7, Math.round(project.visits / 7)))
      setSignupsData(generateTimeSeriesData(7, Math.round(project.signups / 7)))
      setRevenueData(generateTimeSeriesData(7, project.mrr ? Math.round(project.mrr / 30) : 0))
    }
    
    setLoading(false)
  }, [projectId])

  // Generate metric cards for dashboard
  const getMetricCards = (): MetricCard[] => {
    if (!metrics) return []
    
    return [
      {
        id: 'visits',
        label: 'Visites',
        value: metrics.visits,
        previousValue: Math.round(metrics.visits * 0.85),
        unit: '',
        trend: 'up',
        changePercent: 15,
      },
      {
        id: 'conversion',
        label: 'Taux de conversion',
        value: metrics.conversionRate,
        previousValue: metrics.conversionRate - 0.5,
        unit: '%',
        trend: 'up',
        changePercent: 18,
      },
      {
        id: 'signups',
        label: 'Inscriptions',
        value: metrics.signups,
        previousValue: Math.round(metrics.signups * 0.78),
        unit: '',
        trend: 'up',
        changePercent: 28,
      },
      {
        id: 'subscribers',
        label: 'Abonnés',
        value: metrics.subscribers,
        previousValue: Math.round(metrics.subscribers * 0.82),
        unit: '',
        trend: 'up',
        changePercent: 22,
      },
    ]
  }

  // Revenue metrics (for SaaS)
  const getRevenueCards = (): MetricCard[] => {
    if (!metrics || !metrics.mrr) return []
    
    return [
      {
        id: 'mrr',
        label: 'MRR',
        value: metrics.mrr,
        previousValue: Math.round(metrics.mrr * 0.88),
        unit: '€',
        trend: 'up',
        changePercent: 14,
      },
      {
        id: 'arpu',
        label: 'ARPU',
        value: metrics.arpu!,
        previousValue: metrics.arpu! - 2.5,
        unit: '€',
        trend: 'up',
        changePercent: 9,
      },
      {
        id: 'ltv',
        label: 'LTV',
        value: metrics.ltv!,
        previousValue: metrics.ltv! - 25,
        unit: '€',
        trend: 'up',
        changePercent: 8,
      },
      {
        id: 'churn',
        label: 'Churn Rate',
        value: metrics.churnRate!,
        previousValue: metrics.churnRate! + 0.5,
        unit: '%',
        trend: 'down',
        changePercent: -19,
      },
    ]
  }

  // Engagement metrics
  const getEngagementCards = (): MetricCard[] => {
    if (!metrics) return []
    
    return [
      {
        id: 'session',
        label: 'Temps moyen',
        value: Math.round(metrics.avgSessionDuration / 60),
        previousValue: Math.round((metrics.avgSessionDuration / 60) - 1),
        unit: 'min',
        trend: 'up',
        changePercent: 12,
      },
      {
        id: 'pages',
        label: 'Pages/session',
        value: metrics.pagesPerSession,
        previousValue: metrics.pagesPerSession - 0.3,
        unit: '',
        trend: 'up',
        changePercent: 11,
      },
      {
        id: 'bounce',
        label: 'Bounce Rate',
        value: metrics.bounceRate,
        previousValue: metrics.bounceRate + 5,
        unit: '%',
        trend: 'down',
        changePercent: -11,
      },
      {
        id: 'mau',
        label: 'MAU',
        value: metrics.mau,
        previousValue: Math.round(metrics.mau * 0.89),
        unit: '',
        trend: 'up',
        changePercent: 12,
      },
    ]
  }

  return {
    metrics,
    visitsData,
    signupsData,
    revenueData,
    getMetricCards,
    getRevenueCards,
    getEngagementCards,
    loading,
  }
}

// Supabase client initialization (when credentials are available)
export async function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('Supabase not configured - using mock data')
    return null
  }
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  } catch (error) {
    console.error('Failed to initialize Supabase:', error)
    return null
  }
}