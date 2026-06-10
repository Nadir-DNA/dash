/**
 * Authentification du cockpit — porte mono-utilisateur (Ruben).
 *
 * Modèle : un mot de passe unique (DASH_ACCESS_PASSWORD). À la connexion, on
 * pose un cookie de session httpOnly = HMAC-SHA256(secret, payload), vérifié
 * par la middleware. Edge-safe (Web Crypto + btoa), aucune dépendance externe.
 *
 * Variables d'env :
 *   - DASH_ACCESS_PASSWORD : le mot de passe d'accès (requis pour activer l'auth)
 *   - DASH_AUTH_SECRET     : secret de signature du cookie (optionnel ;
 *                            par défaut dérivé de DASH_ACCESS_PASSWORD)
 */

export const SESSION_COOKIE = 'dash_session'
const PAYLOAD = 'dash-cockpit-v1'

function password(): string {
  return process.env.DASH_ACCESS_PASSWORD || ''
}

function secret(): string {
  return process.env.DASH_AUTH_SECRET || process.env.DASH_ACCESS_PASSWORD || ''
}

/** L'auth est-elle configurée (mot de passe défini) ? */
export function isAuthConfigured(): boolean {
  return password().length > 0
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(message: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return toBase64Url(new Uint8Array(sig))
}

/** Jeton de session attendu (valeur du cookie pour une session valide). */
export async function sessionToken(): Promise<string> {
  return hmac(PAYLOAD, secret())
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

/** Le mot de passe fourni est-il correct ? */
export function checkPassword(input: string): boolean {
  const expected = password()
  if (!expected) return false
  return safeEqual(input, expected)
}

/** Le cookie de session est-il valide ? */
export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token || !isAuthConfigured()) return false
  return safeEqual(token, await sessionToken())
}
