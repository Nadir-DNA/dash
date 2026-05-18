export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-state">
      <div className="error-state-icon">⚠️</div>
      <div className="error-state-title">Erreur de chargement</div>
      <div className="error-state-desc">{message}</div>
      <button className="retry-btn" onClick={onRetry}>Réessayer</button>
    </div>
  )
}
