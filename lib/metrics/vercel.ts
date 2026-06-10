/**
 * Déploiement — dernier déploiement Vercel d'un projet (REST via fetch).
 *
 * Config : VERCEL_TOKEN (requis pour les données live), VERCEL_TEAM_ID (optionnel).
 * Le nom de projet Vercel vient de `vercelProject` du registre (sinon l'id).
 * Dégrade proprement si le token manque (renvoie `configured: false`).
 */

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID

export type DeployState =
  | 'READY'
  | 'ERROR'
  | 'BUILDING'
  | 'QUEUED'
  | 'CANCELED'
  | 'INITIALIZING'
  | 'UNKNOWN'

export interface DeploymentStatus {
  /** false si VERCEL_TOKEN absent → on n'affiche pas la tuile déploiement. */
  configured: boolean
  state: DeployState
  /** timestamp (ms) de création du déploiement, ou null. */
  createdAt: number | null
  /** URL du déploiement, ou null. */
  url: string | null
}

interface VercelDeployment {
  state?: string
  readyState?: string
  created?: number
  createdAt?: number
  url?: string
}

const UNCONFIGURED: DeploymentStatus = {
  configured: false,
  state: 'UNKNOWN',
  createdAt: null,
  url: null,
}

/**
 * Récupère le dernier déploiement d'un projet Vercel. Jamais d'exception.
 */
export async function fetchLatestDeployment(
  vercelProject: string | undefined,
): Promise<DeploymentStatus> {
  if (!VERCEL_TOKEN || !vercelProject) return UNCONFIGURED

  try {
    const params = new URLSearchParams({ app: vercelProject, limit: '1' })
    if (VERCEL_TEAM_ID) params.set('teamId', VERCEL_TEAM_ID)

    const res = await fetch(`https://api.vercel.com/v6/deployments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) return { ...UNCONFIGURED, configured: true }

    const body = (await res.json()) as { deployments?: VercelDeployment[] }
    const dep = body.deployments?.[0]
    if (!dep) return { ...UNCONFIGURED, configured: true }

    const raw = (dep.readyState ?? dep.state ?? 'UNKNOWN').toUpperCase()
    const VALID: readonly string[] = ['READY', 'ERROR', 'BUILDING', 'QUEUED', 'CANCELED', 'INITIALIZING']
    const state: DeployState = VALID.includes(raw) ? (raw as DeployState) : 'UNKNOWN'

    return {
      configured: true,
      state,
      createdAt: dep.created ?? dep.createdAt ?? null,
      url: dep.url ? `https://${dep.url}` : null,
    }
  } catch {
    return { ...UNCONFIGURED, configured: true }
  }
}
