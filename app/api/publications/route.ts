import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.resolve(process.cwd(), 'data', 'publications.json')

function readPosts() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')).posts
  } catch {
    return []
  }
}

function writePosts(posts: any[]) {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  // Écriture atomique : temp file → rename pour éviter la corruption en cas de crash
  const tmp = DATA_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify({ posts }, null, 2))
  fs.renameSync(tmp, DATA_FILE)
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// GET /api/publications?project=amens&network=tiktok&date=2026-06
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  let posts = readPosts()

  const project = searchParams.get('project')
  const network = searchParams.get('network')
  const date = searchParams.get('date')
  const status = searchParams.get('status')

  if (project) posts = posts.filter((p: any) => p.project === project)
  if (network) posts = posts.filter((p: any) => p.network === network)
  if (date) {
    if (date.length === 7) posts = posts.filter((p: any) => p.date.startsWith(date))
    else posts = posts.filter((p: any) => p.date === date)
  }
  if (status) posts = posts.filter((p: any) => p.status === status)

  posts.sort((a: any, b: any) => a.date.localeCompare(b.date))

  return NextResponse.json({ posts })
}

// POST /api/publications
export async function POST(req: Request) {
  const body = await req.json()
  const { date, title, description, project, network, status } = body

  if (!date || !title) {
    return NextResponse.json({ error: 'date et title requis' }, { status: 400 })
  }

  const post = {
    id: generateId(),
    date,
    title,
    description: description || '',
    project: project || 'amens',
    network: network || 'tiktok',
    status: status || 'draft',
    createdAt: new Date().toISOString(),
  }

  const posts = readPosts()
  posts.push(post)
  writePosts(posts)

  return NextResponse.json({ post }, { status: 201 })
}

// PATCH /api/publications
export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'id requis' }, { status: 400 })
  }

  const posts = readPosts()
  const idx = posts.findIndex((p: any) => p.id === id)
  if (idx === -1) {
    return NextResponse.json({ error: 'Publication introuvable' }, { status: 404 })
  }

  posts[idx] = { ...posts[idx], ...updates }
  writePosts(posts)

  return NextResponse.json({ post: posts[idx] })
}

// DELETE /api/publications?id=xxx
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id requis' }, { status: 400 })
  }

  let posts = readPosts()
  const idx = posts.findIndex((p: any) => p.id === id)
  if (idx === -1) {
    return NextResponse.json({ error: 'Publication introuvable' }, { status: 404 })
  }

  const removed = posts.splice(idx, 1)[0]
  writePosts(posts)

  return NextResponse.json({ deleted: removed })
}
