/**
 * Santé — ping l'URL de production d'un projet.
 * Zéro configuration : utilise simplement `links.prod` du registre.
 */

export interface HealthStatus {
  /** true si l'URL répond avec un statut < 500. */
  ok: boolean
  /** code HTTP, ou null si la requête a échoué (réseau/timeout). */
  status: number | null
  latencyMs: number
  /** false si le projet n'a pas d'URL de prod à surveiller. */
  monitored: boolean
}

const TIMEOUT_MS = 8000

/**
 * Vérifie qu'une URL de prod répond. Dégrade proprement (jamais d'exception).
 */
export async function checkHealth(url: string | undefined): Promise<HealthStatus> {
  if (!url) {
    return { ok: false, status: null, latencyMs: 0, monitored: false }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const start = Date.now()

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'DashCockpit/1.0 (health-check)' },
    })
    return {
      ok: res.status < 500,
      status: res.status,
      latencyMs: Date.now() - start,
      monitored: true,
    }
  } catch {
    return { ok: false, status: null, latencyMs: Date.now() - start, monitored: true }
  } finally {
    clearTimeout(timeout)
  }
}
