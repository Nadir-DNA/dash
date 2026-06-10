'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, checkPassword, sessionToken, isAuthConfigured } from '@/lib/auth'

const MAX_AGE = 60 * 60 * 24 * 30 // 30 jours

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  if (!isAuthConfigured()) {
    return { error: "Auth non configurée : définissez DASH_ACCESS_PASSWORD dans l'environnement." }
  }

  const password = String(formData.get('password') ?? '')
  if (!checkPassword(password)) {
    return { error: 'Mot de passe incorrect.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })

  const from = String(formData.get('from') ?? '/')
  redirect(from.startsWith('/') && !from.startsWith('/login') ? from : '/')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect('/login')
}
