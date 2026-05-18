import { NextResponse } from 'next/server'

const TRAILBASE = process.env.NEXT_PUBLIC_TRAILBASE_URL || 'http://localhost:4000'

// GET /api/sitevitrine?status=deployed&limit=100&offset=0&count=true
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const stage = searchParams.get('stage')
  const limit = searchParams.get('limit') ?? '100'
  const offset = searchParams.get('offset') ?? '0'
  const count = searchParams.get('count') === 'true'

  let url = `${TRAILBASE}/api/records/v1/sitevitrine_sites?limit=${limit}&offset=${offset}&order=-created_at`
  if (count) url += '&count=true'
  if (status) url += `&filter=status%3D'${encodeURIComponent(status)}'`
  if (stage) url += `&filter=stage%3D'${encodeURIComponent(stage)}'`

  const res = await fetch(url)
  if (!res.ok) return NextResponse.json({ error: 'TrailBase error' }, { status: res.status })
  const data = await res.json()
  return NextResponse.json(data)
}

// PATCH /api/sitevitrine
// Body: { id: string, status?: string, stage?: string, notes?: string, site_url?: string, ... }
export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })

  const res = await fetch(`${TRAILBASE}/api/records/v1/sitevitrine_sites/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  return NextResponse.json({ ok: true, id, updates })
}
