/**
 * Agrégateur de STATUT du cockpit : santé (ping prod) + déploiement (Vercel),
 * par projet, dérivé du registre unique (lib/projects.ts).
 *
 * Tout en parallèle, dégradation gracieuse : une source KO n'empêche pas
 * les autres de s'afficher. Caché en mémoire 15s comme les métriques.
 */

import { PROJECTS } from '@/lib/projects'
import { checkHealth, type HealthStatus } from './health'
import { fetchLatestDeployment, type DeploymentStatus } from './vercel'

export interface ProjectStatus {
  id: string
  health: HealthStatus
  deploy: DeploymentStatus
}

let _cache: Record<string, ProjectStatus> | null = null
let _ts = 0
const TTL_MS = 15_000

export async function getProjectsStatus(): Promise<Record<string, ProjectStatus>> {
  const now = Date.now()
  if (_cache && now - _ts < TTL_MS) return _cache

  const entries = await Promise.all(
    PROJECTS.map(async (p): Promise<ProjectStatus> => {
      const [health, deploy] = await Promise.all([
        checkHealth(p.links?.prod),
        fetchLatestDeployment(p.vercelProject ?? p.id),
      ])
      return { id: p.id, health, deploy }
    }),
  )

  const map: Record<string, ProjectStatus> = {}
  for (const e of entries) map[e.id] = e

  _cache = map
  _ts = now
  return map
}
