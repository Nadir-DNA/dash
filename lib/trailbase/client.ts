import { initClient } from 'trailbase'
import type { Database } from './types'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_TRAILBASE_URL
  if (!url) throw new Error("Variable d'environnement NEXT_PUBLIC_TRAILBASE_URL manquante")
  return initClient(url)
}
