export const STAGES = [
  { key: 'new', label: 'Nouveaux' },
  { key: 'contacted', label: 'Contactés' },
  { key: 'qualified', label: 'Qualifiés' },
  { key: 'proposal', label: 'Proposition' },
  { key: 'negotiation', label: 'Négociation' },
  { key: 'won', label: 'Gagnés' },
  { key: 'lost', label: 'Perdus' },
]

export const STAGE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  new: 'secondary', contacted: 'outline', qualified: 'outline',
  proposal: 'outline', negotiation: 'default', won: 'default', lost: 'destructive',
}

export const STAGE_LABELS: Record<string, string> = {
  new: 'Nouveau', contacted: 'Contacté', qualified: 'Qualifié',
  proposal: 'Proposition', negotiation: 'Négociation', won: 'Gagné', lost: 'Perdu',
}

export const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline', active: 'default', paused: 'secondary', completed: 'secondary',
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', active: 'Active', paused: 'En pause', completed: 'Terminée',
}

export const ENROLLMENT_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  enrolled: 'outline', sent: 'secondary', opened: 'default', clicked: 'default',
  replied: 'default', unsubscribed: 'destructive', bounced: 'destructive',
  active: 'default', completed: 'secondary',
}

export const ENROLLMENT_LABELS: Record<string, string> = {
  enrolled: 'Enrôlé', sent: 'Envoyé', opened: 'Ouvert', clicked: 'Cliqué',
  replied: 'Répondu', unsubscribed: 'Désinscrit', bounced: 'Bounce',
  active: 'Actif', completed: 'Terminé',
}

export const CHANNEL_LABELS: Record<string, string> = {
  email: '📧 Email', sms: '💬 SMS', sequence: '🔄 Séquence',
}

// Form options derived from constants — prevents duplication across form components
export const STAGE_OPTIONS = Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label }))

export const SOURCES = ['LinkedIn', 'Site web', 'Recommandation', 'Email', 'Événement', 'Cold outreach', 'Autre']

export const INDUSTRIES = [
  'SaaS', 'E-commerce', 'Fintech', 'Healthtech', 'Immobilier',
  'Consulting', 'Agence', 'Retail', 'Industrie', 'Autre',
]

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']
