/**
 * Dash Metrics - Common Types
 */

export type ProjectName = 'amens' | 'flashcert' | 'crm' | 'sitevitrine' | 'leagueplay';

export interface Metric {
  key: string;
  value: number;
  target: number;
  unit: string;
  change: number;
  description: string;
}

export interface ProjectMetricsPayload {
  project: ProjectName;
  timestamp: string;
  metrics: Metric[];
}

export interface AllMetricsResponse {
  timestamp: string;
  projects: ProjectMetricsPayload[];
  summary: {
    totalMetrics: number;
    healthyProjects: number;
    totalProjects: number;
  };
}

export interface ProjectHealth {
  project: ProjectName;
  connected: boolean;
  latencyMs: number;
  error?: string;
  lastCheck: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  uptime: number;
  projects: ProjectHealth[];
}
