import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { ProjectMetrics, MetricCard, TimeSeriesData } from '../types/metrics'
import { generateTimeSeriesData, DEFAULT_PROJECTS } from '../types/metrics'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

export function useMetrics(projectId: string = 'amens') {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null)
  const [visitsData, setVisitsData] = useState<TimeSeriesData[]>([])
  const [signupsData, setSignupsData] = useState<TimeSeriesData[]>([])
  const [revenueData, setRevenueData] = useState<TimeSeriesData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      if (!supabase) {
        // Fallback to mock data
        const project = DEFAULT_PROJECTS.find(p => p.id === projectId)
        if (project) {
          setMetrics(project)
          setVisitsData(generateTimeSeriesData(7, Math.round(project.visits / 7)))
          setSignupsData(generateTimeSeriesData(7, Math.round(project.signups / 7)))
          setRevenueData(generateTimeSeriesData(7, project.mrr ? Math.round(project.mrr / 30) : 0))
        }
        setLoading(false)
        return
      }

      try {
        // Try to fetch from Supabase
        // Table: dash_metrics
        const { data, error } = await supabase
          .from('dash_metrics')
          .select('*')
          .eq('project_id', projectId)
          .order('date', { ascending: false })
          .limit(30)

        if (error) {
          console.log('Supabase error, using mock data:', error.message)
          const project = DEFAULT_PROJECTS.find(p => p.id === projectId)
          if (project) {
            setMetrics(project)
            setVisitsData(generateTimeSeriesData(7, Math.round(project.visits / 7)))
            setSignupsData(generateTimeSeriesData(7, Math.round(project.signups / 7)))
            setRevenueData(generateTimeSeriesData(7, project.mrr ? Math.round(project.mrr / 30) : 0))
          }
        } else if (data && data.length > 0) {
          // Process real data
          const latest = data[0]
          const project = DEFAULT_PROJECTS.find(p => p.id === projectId) || DEFAULT_PROJECTS[0]
          
          setMetrics({
            ...project,
            visits: latest.visits || project.visits,
            pageViews: latest.page_views || project.pageViews,
            uniqueVisitors: latest.unique_visitors || project.uniqueVisitors,
            conversionRate: latest.conversion_rate || project.conversionRate,
            signups: latest.signups || project.signups,
            subscribers: latest.subscribers || project.subscribers,
            dau: latest.dau || project.dau,
            mau: latest.mau || project.mau,
            mrr: latest.mrr || project.mrr,
          })
          
          // Time series
          setVisitsData(data.slice(0, 7).reverse().map(d => ({
            date: d.date,
            value: d.visits || 0,
          })))
          
          setSignupsData(data.slice(0, 7).reverse().map(d => ({
            date: d.date,
            value: d.signups || 0,
          })))
          
          setRevenueData(data.slice(0, 7).reverse().map(d => ({
            date: d.date,
            value: d.mrr ? Math.round(d.mrr / 30) : 0,
          })))
        }
      } catch (err) {
        console.error('Failed to fetch metrics:', err)
        const project = DEFAULT_PROJECTS.find(p => p.id === projectId)
        if (project) {
          setMetrics(project)
          setVisitsData(generateTimeSeriesData(7, Math.round(project.visits / 7)))
          setSignupsData(generateTimeSeriesData(7, Math.round(project.signups / 7)))
          setRevenueData(generateTimeSeriesData(7, project.mrr ? Math.round(project.mrr / 30) : 0))
        }
      }
      
      setLoading(false)
    }

    fetchMetrics()
  }, [projectId])

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
        label: 'Conversion',
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
        label: 'Churn',
        value: metrics.churnRate!,
        previousValue: metrics.churnRate! + 0.5,
        unit: '%',
        trend: 'down',
        changePercent: -19,
      },
    ]
  }

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
    supabase: !!supabase,
  }
}