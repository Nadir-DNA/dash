import { initClient } from 'trailbase'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()

  const authToken = cookieStore.get('auth_token')?.value
  const refreshToken = cookieStore.get('refresh_token')?.value

  const client = initClient(env.TRAILBASE_URL, {
    tokens: authToken
      ? {
          auth_token: authToken,
          refresh_token: refreshToken || null,
          csrf_token: null,
        }
      : undefined,
  })

  return client
}

export async function getUser() {
  const client = await createClient()
  // user() is synchronous — reads from current tokens
  return client.user() ?? null
}
