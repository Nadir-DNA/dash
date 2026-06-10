// Types pour l'API Chat AI DeepSeek v4

export interface ChatRequest {
  message: string
  sessionId?: string
  /** Projet courant (cloisonnement des outils CRM de l'agent). */
  projectId?: string
}

export interface ChatResponse {
  reply: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
  }
  model: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface DeepSeekRequest {
  model: string
  messages: DeepSeekMessage[]
  temperature: number
  max_tokens: number
  stream: boolean
}

export interface DeepSeekResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: 'assistant'
      content: string | null
      tool_calls?: ToolCall[]
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// Union type pour les codes d'erreur
export type ErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONFIG_ERROR'
  | 'AI_PROVIDER_ERROR'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_PROVIDER_DOWN'

export interface ApiError {
  error: string
  code: ErrorCode
  details?: string
}

// Options pour callDeepSeek
export interface ChatOptions {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}
