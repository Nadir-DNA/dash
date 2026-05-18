const MESSAGES: Record<string, { icon: string; title: string; desc: string }> = {
  sitevitrine: {
    icon: '🔌',
    title: 'Sitevitrine non connecté',
    desc: 'VITE_TRAILBASE_URL manquante ou TrailBase indisponible.',
  },
  flashcert: {
    icon: '🚧',
    title: 'FlashCert en attente',
    desc: 'Le projet FlashCert sera connecté prochainement.',
  },
}

export function EmptyState({ projectId }: { projectId: string }) {
  const msg = MESSAGES[projectId] || {
    icon: '📭',
    title: 'Aucune donnée',
    desc: 'Pas encore de métriques pour ce projet.',
  }
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{msg.icon}</div>
      <div className="empty-state-title">{msg.title}</div>
      <div className="empty-state-desc">{msg.desc}</div>
    </div>
  )
}
