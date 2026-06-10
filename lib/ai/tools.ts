/**
 * Outils CRM exposés à l'agent IA (function-calling).
 *
 * L'agent peut désormais AGIR sur le CRM (vision AgentCRM) : compter, lister,
 * créer des contacts — toujours cloisonné par projet (cf. Phase 4).
 *
 * Les exécuteurs parlent directement à TrailBase (REST), côté serveur.
 */

import type { ToolDefinition } from '@/lib/ai/types'

const TRAILBASE = process.env.NEXT_PUBLIC_TRAILBASE_URL || 'http://localhost:4000'
const CONTACTS = `${TRAILBASE}/api/records/v1/contacts`
const GLOBAL_VIEWS = new Set(['', 'general', 'crm'])

export interface ToolContext {
  /** Projet courant (depuis l'UI). Utilisé comme défaut/scope des outils. */
  projectId: string
}

// ─── Définitions exposées au modèle ────────────────────────────────────

export const CRM_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'count_contacts',
      description: "Compte les contacts du CRM, optionnellement filtrés par étape (stage). Cloisonné au projet courant.",
      parameters: {
        type: 'object',
        properties: {
          stage: { type: 'string', description: "Étape du pipeline (ex: new, contacted, won, lost). Optionnel." },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_contacts',
      description: 'Liste les contacts récents du CRM (cloisonné au projet courant).',
      parameters: {
        type: 'object',
        properties: {
          stage: { type: 'string', description: 'Filtre optionnel par étape.' },
          limit: { type: 'number', description: 'Nombre max de contacts (défaut 10, max 50).' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_contact',
      description: 'Crée un nouveau contact dans le CRM, rattaché au projet courant.',
      parameters: {
        type: 'object',
        properties: {
          first_name: { type: 'string', description: 'Prénom.' },
          last_name: { type: 'string', description: 'Nom.' },
          email: { type: 'string', description: 'Email (optionnel).' },
          phone: { type: 'string', description: 'Téléphone (optionnel).' },
          company: { type: 'string', description: 'Société (optionnel).' },
          stage: { type: 'string', description: "Étape initiale (défaut 'new')." },
        },
        required: ['first_name', 'last_name'],
      },
    },
  },
]

// ─── Exécuteurs ────────────────────────────────────────────────────────

function projectFilter(ctx: ToolContext): string {
  if (GLOBAL_VIEWS.has(ctx.projectId)) return ''
  return `&filter=project_id%3D'${encodeURIComponent(ctx.projectId)}'`
}

async function countContacts(args: { stage?: string }, ctx: ToolContext): Promise<string> {
  let url = `${CONTACTS}?limit=1&count=true${projectFilter(ctx)}`
  if (args.stage) url += `&filter=stage%3D'${encodeURIComponent(args.stage)}'`
  const res = await fetch(url)
  if (!res.ok) return JSON.stringify({ error: 'Lecture impossible' })
  const data = await res.json()
  return JSON.stringify({ project: ctx.projectId, stage: args.stage ?? 'tous', count: data.total_count ?? 0 })
}

async function listContacts(args: { stage?: string; limit?: number }, ctx: ToolContext): Promise<string> {
  const limit = Math.min(Math.max(1, args.limit ?? 10), 50)
  let url = `${CONTACTS}?limit=${limit}&order=-created_at${projectFilter(ctx)}`
  if (args.stage) url += `&filter=stage%3D'${encodeURIComponent(args.stage)}'`
  const res = await fetch(url)
  if (!res.ok) return JSON.stringify({ error: 'Lecture impossible' })
  const data = await res.json()
  const records = (data.records ?? []) as Record<string, unknown>[]
  const items = records.map((r) => ({
    id: r.id,
    name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || '—',
    email: r.email ?? null,
    stage: r.stage ?? 'new',
  }))
  return JSON.stringify({ project: ctx.projectId, count: items.length, contacts: items })
}

async function createContact(
  args: { first_name?: string; last_name?: string; email?: string; phone?: string; company?: string; stage?: string },
  ctx: ToolContext,
): Promise<string> {
  if (!args.first_name || !args.last_name) {
    return JSON.stringify({ error: 'first_name et last_name sont requis' })
  }
  // En vue globale, on refuse la création sans projet explicite (cloisonnement).
  if (GLOBAL_VIEWS.has(ctx.projectId)) {
    return JSON.stringify({ error: 'Sélectionne un projet précis avant de créer un contact.' })
  }
  const payload = {
    project_id: ctx.projectId,
    first_name: args.first_name,
    last_name: args.last_name,
    email: args.email ?? null,
    phone: args.phone ?? null,
    company: args.company ?? null,
    stage: args.stage ?? 'new',
  }
  const res = await fetch(CONTACTS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    return JSON.stringify({ error: 'Création refusée par la base', details: err.slice(0, 200) })
  }
  const data = await res.json().catch(() => ({}))
  return JSON.stringify({ ok: true, id: data.id ?? null, project: ctx.projectId, name: `${args.first_name} ${args.last_name}` })
}

/** Exécute un outil par nom. Jamais d'exception (renvoie une erreur JSON). */
export async function executeTool(name: string, rawArgs: string, ctx: ToolContext): Promise<string> {
  let args: Record<string, unknown> = {}
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {}
  } catch {
    return JSON.stringify({ error: 'Arguments JSON invalides' })
  }
  try {
    switch (name) {
      case 'count_contacts':
        return await countContacts(args, ctx)
      case 'list_contacts':
        return await listContacts(args, ctx)
      case 'create_contact':
        return await createContact(args, ctx)
      default:
        return JSON.stringify({ error: `Outil inconnu : ${name}` })
    }
  } catch (err) {
    return JSON.stringify({ error: 'Erreur exécution outil', details: err instanceof Error ? err.message : String(err) })
  }
}
