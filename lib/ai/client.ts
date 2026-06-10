import { AI_CONFIG } from '@/lib/ai/constants'
import { env } from '@/lib/env'
import type { DeepSeekResponse, DeepSeekMessage, ChatOptions, ToolDefinition } from '@/lib/ai/types'

export class DeepSeekError extends Error {
  constructor(
    message: string,
    public readonly code: 'TIMEOUT' | 'PROVIDER_ERROR' | 'PROVIDER_DOWN' | 'CONFIG_ERROR',
    public readonly status?: number,
    public readonly details?: string
  ) {
    super(message)
    this.name = 'DeepSeekError'
  }
}

/**
 * Tronque un message trop long en gardant la fin (info la plus récente).
 */
function truncateMessage(message: string, maxChars: number): string {
  if (message.length <= maxChars) return message
  const truncated = message.slice(-maxChars)
  return `[... message tronqué (${message.length} → ${maxChars} car.)]\n${truncated}`
}

/**
 * Appelle l'API DeepSeek v4 (compatible OpenAI) en non-streaming.
 *
 * @param message - Le message utilisateur à envoyer
 * @param options - Options optionnelles (systemPrompt, temperature, maxTokens)
 * @returns Le contenu de la réponse et les tokens utilisés
 */
export async function callDeepSeek(
  message: string,
  options?: ChatOptions
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  // 1. Vérifier la config
  if (!env.DEEPSEEK_API_KEY) {
    throw new DeepSeekError(
      'Clé API DeepSeek manquante',
      'CONFIG_ERROR',
      undefined,
      'La variable DEEPSEEK_API_KEY n\'est pas définie dans .env.local'
    )
  }

  // 2. Troncature intelligente si le message est trop long
  const safeMessage = truncateMessage(message, AI_CONFIG.TRUNCATE_AT_CHARS)

  // 3. Construire les messages
  const userMessage: DeepSeekMessage = { role: 'user', content: safeMessage }

  const body: Record<string, unknown> = {
    model: AI_CONFIG.DEEPSEEK_MODEL,
    messages: [userMessage],
    temperature: options?.temperature ?? AI_CONFIG.TEMPERATURE,
    max_tokens: options?.maxTokens ?? AI_CONFIG.MAX_TOKENS,
    stream: false,
  }

  // System prompt optionnel (injecté par la route si dispo)
  if (options?.systemPrompt) {
    body.messages = [
      { role: 'system', content: options.systemPrompt } as DeepSeekMessage,
      ...(body.messages as DeepSeekMessage[]),
    ]
  }

  // 4. Appel HTTP avec AbortController (timeout)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT_MS)

  try {
    const response = await fetch(AI_CONFIG.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    // 5. Gestion des erreurs HTTP
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      const status = response.status

      if (status >= 400 && status < 500) {
        throw new DeepSeekError(
          'Le service IA est momentanément indisponible',
          'PROVIDER_ERROR',
          status,
          `DeepSeek ${status}: ${errorBody}`
        )
      }

      if (status >= 500) {
        throw new DeepSeekError(
          'Le service IA rencontre une erreur, réessaye plus tard',
          'PROVIDER_ERROR',
          status,
          `DeepSeek ${status}: ${errorBody}`
        )
      }
    }

    // 6. Parser la réponse
    const data: DeepSeekResponse = await response.json()

    if (!data.choices?.[0]?.message?.content) {
      throw new DeepSeekError(
        'Réponse inattendue du service IA',
        'PROVIDER_ERROR',
        response.status,
        'Choices vides ou mal formatés dans la réponse DeepSeek'
      )
    }

    return {
      content: data.choices[0].message.content,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens ?? 0,
        completion_tokens: data.usage?.completion_tokens ?? 0,
      },
    }
  } catch (err) {
    // 7. Timeout
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new DeepSeekError(
        'Le service IA met trop de temps à répondre',
        'TIMEOUT'
      )
    }

    // 8. Network error (DNS, connexion refusée)
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new DeepSeekError(
        'Le service IA est injoignable',
        'PROVIDER_DOWN',
        undefined,
        err.message
      )
    }

    // 9. Re-lancer les erreurs métier
    if (err instanceof DeepSeekError) throw err

    // 10. Erreur inattendue
    throw new DeepSeekError(
      'Erreur inattendue du service IA',
      'PROVIDER_ERROR',
      undefined,
      err instanceof Error ? err.message : String(err)
    )
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Mode AGENT : tool-calling (function calling) ──────────────────────

/** Un seul aller-retour HTTP vers DeepSeek avec messages + tools. */
async function callOnce(
  messages: DeepSeekMessage[],
  tools: ToolDefinition[],
  options?: ChatOptions,
): Promise<DeepSeekResponse> {
  if (!env.DEEPSEEK_API_KEY) {
    throw new DeepSeekError('Clé API DeepSeek manquante', 'CONFIG_ERROR')
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT_MS)
  try {
    const response = await fetch(AI_CONFIG.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: AI_CONFIG.DEEPSEEK_MODEL,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: options?.temperature ?? AI_CONFIG.TEMPERATURE,
        max_tokens: options?.maxTokens ?? AI_CONFIG.MAX_TOKENS,
        stream: false,
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new DeepSeekError('Le service IA a renvoyé une erreur', 'PROVIDER_ERROR', response.status, errorBody.slice(0, 300))
    }
    return (await response.json()) as DeepSeekResponse
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new DeepSeekError('Le service IA met trop de temps à répondre', 'TIMEOUT')
    }
    if (err instanceof DeepSeekError) throw err
    throw new DeepSeekError('Le service IA est injoignable', 'PROVIDER_DOWN', undefined, err instanceof Error ? err.message : String(err))
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Conversation agentique : le modèle peut appeler des outils, qu'on exécute
 * puis on renvoie les résultats, jusqu'à une réponse finale (ou maxIterations).
 *
 * @param userMessage  message utilisateur
 * @param tools        définitions d'outils exposées au modèle
 * @param executeTool  exécuteur (name, argsJSON) → résultat string
 * @param options      systemPrompt / temperature / maxTokens
 */
export async function callDeepSeekAgent(
  userMessage: string,
  tools: ToolDefinition[],
  executeTool: (name: string, args: string) => Promise<string>,
  options?: ChatOptions,
): Promise<{ content: string; toolsUsed: string[] }> {
  const messages: DeepSeekMessage[] = []
  if (options?.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt })
  messages.push({ role: 'user', content: userMessage.slice(0, AI_CONFIG.MAX_MESSAGE_CHARS) })

  const toolsUsed: string[] = []
  const MAX_ITERATIONS = 4

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const data = await callOnce(messages, tools, options)
    const choice = data.choices?.[0]?.message
    if (!choice) throw new DeepSeekError('Réponse inattendue du service IA', 'PROVIDER_ERROR')

    const toolCalls = choice.tool_calls ?? []
    if (toolCalls.length === 0) {
      return { content: choice.content ?? '', toolsUsed }
    }

    // Rejoue le message assistant (avec les tool_calls) puis les résultats.
    messages.push({ role: 'assistant', content: choice.content ?? null, tool_calls: toolCalls })
    for (const call of toolCalls) {
      toolsUsed.push(call.function.name)
      const result = await executeTool(call.function.name, call.function.arguments)
      messages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: result })
    }
  }

  // Dernier tour sans outils pour forcer une réponse finale.
  const final = await callOnce(messages, tools, options)
  return { content: final.choices?.[0]?.message?.content ?? 'Action effectuée.', toolsUsed }
}
