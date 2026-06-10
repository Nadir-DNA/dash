/**
 * POST /api/ai/chat
 *
 * Endpoint de chat avec DeepSeek v4 Flash.
 * Auth: cookie Supabase SSR → fallback Bearer token
 * Rate limiting: 10 req/jour via checkRateLimitRoute
 * Validation: Zod pour message (1-4000 chars), sessionId optionnel
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimitRoute } from '@/lib/rate-limit-api'
import { callDeepSeekAgent, DeepSeekError } from '@/lib/ai/client'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { CRM_TOOLS, executeTool } from '@/lib/ai/tools'
import { AI_CONFIG } from '@/lib/ai/constants'
import type { ChatRequest, ChatResponse, ApiError } from '@/lib/ai/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Extrait l'utilisateur authentifié.
 * Priorité: cookie Supabase SSR → Authorization Bearer fallback
 */
async function getAuthenticatedUser(request: NextRequest) {
  // 1. Essayer cookie Supabase SSR
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (user && !error) return user

  // 2. Fallback: Authorization Bearer token
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user: tokenUser }, error: tokenError } =
      await supabase.auth.getUser(token)

    if (tokenUser && !tokenError) return tokenUser
  }

  return null
}

/**
 * Valide et parse le body de la requête manuellement (pas de dépendance Zod).
 */
function parseChatBody(body: unknown): { message: string; sessionId?: string; projectId?: string } | ApiError {
  if (!body || typeof body !== 'object') {
    return { error: 'Corps de requête invalide', code: 'INVALID_INPUT' }
  }

  const data = body as Record<string, unknown>

  if (typeof data.message !== 'string' || data.message.trim().length === 0) {
    return { error: 'Le message est requis', code: 'INVALID_INPUT' }
  }

  if (data.message.length > AI_CONFIG.MAX_MESSAGE_CHARS) {
    return {
      error: `Le message ne doit pas dépasser ${AI_CONFIG.MAX_MESSAGE_CHARS} caractères`,
      code: 'INVALID_INPUT',
    }
  }

  if (data.sessionId !== undefined && typeof data.sessionId !== 'string') {
    return { error: 'sessionId doit être une chaîne de caractères', code: 'INVALID_INPUT' }
  }

  return {
    message: data.message.trim(),
    sessionId: data.sessionId as string | undefined,
    projectId: typeof data.projectId === 'string' ? data.projectId : undefined,
  }
}

export async function POST(request: NextRequest) {
  // 1. Authentification
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'Non authentifié', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  // 2. Validation du body
  let body: ChatRequest
  try {
    const rawBody = await request.json()
    const parsed = parseChatBody(rawBody)
    if ('code' in parsed) {
      return NextResponse.json<ApiError>(parsed, { status: 400 })
    }
    body = parsed
  } catch {
    return NextResponse.json<ApiError>(
      { error: 'Corps de requête invalide (JSON malformé)', code: 'INVALID_INPUT' },
      { status: 400 }
    )
  }

  // 3. Rate limiting (après validation — ne pas gaspiller un quota sur un body invalide)
  const rateCheck = await checkRateLimitRoute(request, user.id)
  if (rateCheck) return rateCheck

  // 4. Appel à l'agent DeepSeek (avec outils CRM, cloisonnés au projet courant)
  try {
    const projectId = body.projectId ?? 'general'
    const systemPrompt = buildSystemPrompt(user, projectId)
    const result = await callDeepSeekAgent(
      body.message,
      CRM_TOOLS,
      (name, args) => executeTool(name, args, { projectId }),
      { systemPrompt },
    )

    const response: ChatResponse = {
      reply: result.content,
      usage: { prompt_tokens: 0, completion_tokens: 0 },
      model: AI_CONFIG.DEEPSEEK_MODEL,
    }

    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof DeepSeekError) {
      const statusMap: Record<string, number> = {
        TIMEOUT: 504,
        PROVIDER_DOWN: 503,
        PROVIDER_ERROR: 502,
        CONFIG_ERROR: 500,
      }

      const status = statusMap[err.code] ?? 502
      const apiError: ApiError = {
        error: err.message,
        code: status === 500 ? 'CONFIG_ERROR'
          : status === 504 ? 'AI_PROVIDER_TIMEOUT'
          : status === 503 ? 'AI_PROVIDER_DOWN'
          : 'AI_PROVIDER_ERROR',
        details: err.details,
      }

      return NextResponse.json(apiError, { status })
    }

    // Erreur inattendue
    console.error('[ai/chat] Unexpected error:', err)
    return NextResponse.json<ApiError>(
      { error: 'Erreur interne du serveur', code: 'AI_PROVIDER_ERROR' },
      { status: 500 }
    )
  }
}
