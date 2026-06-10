/**
 * REGISTRE DE PROJETS — source de vérité unique du cockpit Dash.
 *
 * Remplace les listes codées en dur qui existaient dans :
 *   - app/page.tsx
 *   - lib/ProjectContext.tsx
 *   - components/general-dashboard.tsx
 *
 * Tout nouveau projet s'ajoute ICI et apparaît partout.
 * L'avancement (roadmap / TODO / audits) reste dans Obsidian `20-Projets/`
 * (source de vérité) — `obsidianNote` pointe vers la note du projet.
 */

import {
  LayoutDashboard,
  Globe,
  Swords,
  ShieldCheck,
  Dumbbell,
  Bot,
  type LucideIcon,
} from 'lucide-react'

export type ProjectStatus = 'production' | 'build' | 'idea' | 'paused'
export type ProjectPriority = 'P0' | 'P1' | 'P2'

export interface ProjectLinks {
  repo?: string
  prod?: string
  vercel?: string
  supabase?: string
}

export interface ProjectDef {
  /** identifiant stable, utilisé dans les URLs (?p=...) et les connecteurs */
  id: string
  name: string
  tagline: string
  status: ProjectStatus
  priority: ProjectPriority
  icon: LucideIcon
  /** couleur d'accent (hex) */
  color: string
  links?: ProjectLinks
  /**
   * Table à interroger pour un compteur rapide dans la vue consolidée.
   * Absent = pas encore de source de données branchée (affiché "non configuré").
   */
  table?: string
  nameField?: string
  /** note Obsidian (source de vérité de l'avancement) */
  obsidianNote?: string
}

export const PROJECTS: ProjectDef[] = [
  {
    id: 'amens',
    name: 'Amens',
    tagline: 'Bien-être & rendez-vous',
    status: 'production',
    priority: 'P0',
    icon: LayoutDashboard,
    color: '#22C55E',
    links: {
      repo: 'https://github.com/Nadir-DNA/amens-bien-etre-rendezvous',
      prod: 'https://amens.fr',
      supabase: 'https://supabase.com/dashboard/project/ntsbywucjgusewcgblhz',
    },
    obsidianNote: '20-Projets/Amens-Audit-Complet-Correctifs.md',
  },
  {
    id: 'fieat',
    name: 'Fieat',
    tagline: 'Coach sport & nutrition IA',
    status: 'build',
    priority: 'P1',
    icon: Dumbbell,
    color: '#2DD4BF',
    links: {
      repo: 'https://github.com/Nadir-DNA/fitgenie-sportive',
    },
    obsidianNote: '20-Projets/Fieat-Audit-Complet-Correctifs.md',
  },
  {
    id: 'agenthub',
    name: 'AgentHub',
    tagline: 'Assistants IA métier (desktop)',
    status: 'build',
    priority: 'P2',
    icon: Bot,
    color: '#FB7185',
    obsidianNote: '20-Projets/AgentHub-Audit-Complet-Correctifs.md',
  },
  {
    id: 'leagueplay',
    name: 'LeaguePlay',
    tagline: 'Sport & communauté',
    status: 'build',
    priority: 'P1',
    icon: Swords,
    color: '#F59E0B',
    links: {
      repo: 'https://github.com/Nadir-DNA/leagueplay',
    },
    table: 'leagueplay_players',
    nameField: 'username',
    obsidianNote: '20-Projets/LeaguePlay-Audit-Complet-Correctifs.md',
  },
  {
    id: 'sitevitrine',
    name: 'SiteVitrine',
    tagline: 'Sites professionnels',
    status: 'build',
    priority: 'P2',
    icon: Globe,
    color: '#818cf8',
    table: 'sitevitrine_sites',
    nameField: 'name',
  },
  {
    id: 'flashcert',
    name: 'FlashCert',
    tagline: 'Formation & CPF',
    status: 'idea',
    priority: 'P2',
    icon: ShieldCheck,
    color: '#a855f7',
    table: 'flashcert_users',
    nameField: 'email',
  },
]

/** Tous les projets, dans l'ordre du registre. */
export function getProjects(): ProjectDef[] {
  return PROJECTS
}

/** Un projet par id. */
export function getProject(id: string): ProjectDef | undefined {
  return PROJECTS.find((p) => p.id === id)
}

/** Lien vers le dashboard d'un projet. */
export function projectHref(id: string): string {
  return `/dashboard?p=${id}`
}

/** Projets ayant une source de données branchée (table renseignée). */
export function getConnectedProjects(): ProjectDef[] {
  return PROJECTS.filter((p) => !!p.table)
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  production: 'En production',
  build: 'En construction',
  idea: 'Idée',
  paused: 'En pause',
}
