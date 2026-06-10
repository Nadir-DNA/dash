/**
 * Client Stripe minimal (REST via fetch) pour le calcul de revenu.
 *
 * Pas de dépendance au SDK `stripe` : on reste cohérent avec les connecteurs
 * qui utilisent `fetch` (cf. amens.ts/Supabase). Réutilisable par n'importe
 * quel projet : passer la clé secrète Stripe du projet concerné.
 */

const STRIPE_BASE = 'https://api.stripe.com/v1'

interface StripePrice {
  unit_amount: number | null
  currency: string
  recurring: { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number } | null
}

interface StripeSubItem {
  quantity?: number
  price: StripePrice
}

interface StripeSubscription {
  id: string
  status: string
  items: { data: StripeSubItem[] }
}

interface StripeListResponse<T> {
  data: T[]
  has_more: boolean
}

/** Normalise le montant d'un abonnement (en cents) vers un montant MENSUEL. */
function monthlyAmountCents(item: StripeSubItem): number {
  const price = item.price
  if (!price?.unit_amount || !price.recurring) return 0
  const qty = item.quantity ?? 1
  const base = price.unit_amount * qty
  const { interval, interval_count } = price.recurring
  const perInterval = base / Math.max(1, interval_count)
  switch (interval) {
    case 'year':
      return perInterval / 12
    case 'week':
      return perInterval * (52 / 12)
    case 'day':
      return perInterval * (365 / 12)
    case 'month':
    default:
      return perInterval
  }
}

export interface RevenueSnapshot {
  /** MRR réel en euros (arrondi). */
  mrr: number
  /** Nombre d'abonnements actifs. */
  activeSubscriptions: number
  /** true si les données viennent de Stripe, false si la clé manque. */
  live: boolean
}

/**
 * Calcule le MRR réel à partir des abonnements Stripe actifs.
 * Renvoie `live: false` si la clé est absente (l'appelant peut alors estimer).
 */
export async function fetchStripeRevenue(secretKey: string | undefined): Promise<RevenueSnapshot> {
  if (!secretKey) {
    return { mrr: 0, activeSubscriptions: 0, live: false }
  }

  let mrrCents = 0
  let count = 0
  let startingAfter: string | undefined
  // Cap de sécurité : 10 pages × 100 = 1000 abonnements
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({ status: 'active', limit: '100' })
    params.append('expand[]', 'data.items.data.price')
    if (startingAfter) params.set('starting_after', startingAfter)

    const res = await fetch(`${STRIPE_BASE}/subscriptions?${params.toString()}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    if (!res.ok) throw new Error(`Stripe API ${res.status}`)

    const body = (await res.json()) as StripeListResponse<StripeSubscription>
    for (const sub of body.data) {
      count++
      for (const item of sub.items?.data ?? []) {
        mrrCents += monthlyAmountCents(item)
      }
    }

    if (!body.has_more || body.data.length === 0) break
    startingAfter = body.data[body.data.length - 1]?.id
  }

  return {
    mrr: Math.round(mrrCents / 100),
    activeSubscriptions: count,
    live: true,
  }
}
