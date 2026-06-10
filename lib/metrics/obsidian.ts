/**
 * Avancement — lecture depuis Obsidian (SOURCE DE VÉRITÉ).
 *
 * Dash ne duplique pas les roadmaps : il LIT les notes du vault
 * (`20-Projets/<note>.md`) pointées par `obsidianNote` dans le registre.
 *
 * Parse :
 *   - frontmatter : `statut`, `date`
 *   - findings par priorité : titres `### N.` sous une section `## ... Px ...`
 *   - tâches : cases `- [ ]` (ouvertes) / `- [x]` (faites)
 *
 * Lecture FILESYSTEM → fonctionne quand Dash tourne sur la même machine que
 * le vault (cockpit local). Dégrade proprement si le chemin/fichier est absent
 * (ex. déploiement distant) : `available: false`.
 */

import { readFile } from 'node:fs/promises'
import { join, isAbsolute } from 'node:path'

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || '/home/nadir/ObsidianVault'

export interface Advancement {
  available: boolean
  statut: string | null
  date: string | null
  findings: { p0: number; p1: number; p2: number; p3: number }
  tasks: { open: number; done: number }
}

const EMPTY: Advancement = {
  available: false,
  statut: null,
  date: null,
  findings: { p0: 0, p1: 0, p2: 0, p3: 0 },
  tasks: { open: 0, done: 0 },
}

function parseFrontmatter(md: string): Record<string, string> {
  const m = md.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return {}
  const out: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.+)$/)
    if (kv) out[kv[1]] = kv[2].trim()
  }
  return out
}

/** Lit l'avancement d'un projet depuis sa note Obsidian. Jamais d'exception. */
export async function readAdvancement(notePath: string | undefined): Promise<Advancement> {
  if (!notePath) return EMPTY

  const full = isAbsolute(notePath) ? notePath : join(VAULT_PATH, notePath)
  let md: string
  try {
    md = await readFile(full, 'utf8')
  } catch {
    return EMPTY
  }

  const fm = parseFrontmatter(md)
  const findings = { p0: 0, p1: 0, p2: 0, p3: 0 }
  let bucket: 'p0' | 'p1' | 'p2' | 'p3' | null = null
  let open = 0
  let done = 0

  for (const line of md.split('\n')) {
    // Section de priorité : "## ... P0 ...", "## ... P1 ..."
    const h2 = line.match(/^##\s+.*\bP([0-3])\b/)
    if (line.startsWith('## ')) {
      bucket = h2 ? (`p${h2[1]}` as 'p0' | 'p1' | 'p2' | 'p3') : null
      continue
    }
    // Finding numéroté : "### 1. ..." sous une section de priorité
    if (bucket && /^###\s+\d+\./.test(line)) {
      findings[bucket]++
      continue
    }
    // Tâches GitHub
    if (/^\s*- \[ \]/.test(line)) open++
    else if (/^\s*- \[[xX]\]/.test(line)) done++
  }

  return {
    available: true,
    statut: fm.statut ?? null,
    date: fm.date ?? null,
    findings,
    tasks: { open, done },
  }
}
