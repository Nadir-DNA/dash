// TrailBase public REST API wrapper (read-only, no auth)

const TB_URL = import.meta.env.VITE_TRAILBASE_URL as string | undefined
export const TRAILBASE_CONFIGURED = Boolean(TB_URL)

export const FLASHCERT_ENABLED = Boolean(import.meta.env.VITE_FLASHCERT_ENABLED)

async function tbFetch<T>(path: string): Promise<T> {
  if (!TB_URL) throw new Error('VITE_TRAILBASE_URL non configurée')
  const res = await fetch(`${TB_URL}${path}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`TrailBase ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export async function tbCount(table: string, filter?: string): Promise<number> {
  const q = new URLSearchParams({ limit: '0', count: 'true' })
  if (filter) q.set('filter', filter)
  const data = await tbFetch<{ total_count: number }>(
    `/api/records/v1/${encodeURIComponent(table)}?${q}`,
  )
  return data.total_count ?? 0
}

export async function tbList<T = Record<string, unknown>>(
  table: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  const q = new URLSearchParams(params)
  const data = await tbFetch<{ records: T[] }>(
    `/api/records/v1/${encodeURIComponent(table)}?${q}`,
  )
  return data.records ?? []
}
