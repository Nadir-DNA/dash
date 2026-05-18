function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`)
  }
  return value
}

export const env = {
  TRAILBASE_URL: requireEnv('NEXT_PUBLIC_TRAILBASE_URL'),
}
