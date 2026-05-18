export function getFreshness(lastFetch: Date | null): { label: string; cls: string } {
  if (!lastFetch) return { label: 'Chargement...', cls: '' }
  const diffMin = Math.floor((Date.now() - lastFetch.getTime()) / 60000)
  if (diffMin < 2) return { label: 'Live', cls: '' }
  if (diffMin < 30) return { label: `MAJ il y a ${diffMin} min`, cls: '' }
  if (diffMin < 60) return { label: `MAJ il y a ${diffMin} min`, cls: 'stale' }
  return { label: `MAJ il y a ${Math.floor(diffMin / 60)}h`, cls: 'error' }
}
