const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateUUID(value: unknown, name = 'ID'): string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new ValidationError(`${name} invalide`)
  }
  return value
}

export function validateRequired(formData: FormData, field: string, label = field): string {
  const value = formData.get(field)
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${label} est requis`)
  }
  return value.trim()
}

export function validateOptional(formData: FormData, field: string): string | null {
  const value = formData.get(field)
  if (typeof value !== 'string' || !value.trim()) return null
  return value.trim()
}

const VALID_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const
const VALID_CHANNELS = ['email', 'sms', 'sequence'] as const
const VALID_STATUSES = ['draft', 'active', 'paused', 'completed'] as const

export function validateStage(value: unknown): 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost' {
  if (!VALID_STAGES.includes(value as typeof VALID_STAGES[number])) {
    return 'new'
  }
  return value as typeof VALID_STAGES[number]
}

export function validateChannel(value: unknown): 'email' | 'sms' | 'sequence' {
  if (!VALID_CHANNELS.includes(value as typeof VALID_CHANNELS[number])) {
    return 'email'
  }
  return value as typeof VALID_CHANNELS[number]
}

export function validateStatus(value: unknown): 'draft' | 'active' | 'paused' | 'completed' {
  if (!VALID_STATUSES.includes(value as typeof VALID_STATUSES[number])) {
    return 'draft'
  }
  return value as typeof VALID_STATUSES[number]
}

export function validateArraySize(arr: unknown[], max: number, label = 'items'): void {
  if (arr.length > max) {
    throw new ValidationError(`Trop de ${label} (max ${max})`)
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
