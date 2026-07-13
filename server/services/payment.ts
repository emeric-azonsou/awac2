import type { SebpayClient } from '../types'
import { ok, type HttpResult } from '../lib/errors'

// Zone UEMOA : toutes ces devises sont le Franc CFA (XOF), prix de vote identique.
const XOF = { code: 'XOF', name: 'Franc CFA (UEMOA)' }
export const FALLBACK_COUNTRIES = [
  { country_code: 'BJ', country_name: 'Bénin', prefix: '+229', currency: XOF },
  { country_code: 'TG', country_name: 'Togo', prefix: '+228', currency: XOF },
  { country_code: 'CI', country_name: "Côte d'Ivoire", prefix: '+225', currency: XOF },
  { country_code: 'SN', country_name: 'Sénégal', prefix: '+221', currency: XOF },
  { country_code: 'BF', country_name: 'Burkina Faso', prefix: '+226', currency: XOF },
  { country_code: 'ML', country_name: 'Mali', prefix: '+223', currency: XOF },
  { country_code: 'NE', country_name: 'Niger', prefix: '+227', currency: XOF },
  { country_code: 'GW', country_name: 'Guinée-Bissau', prefix: '+245', currency: XOF },
]
export const FALLBACK_OPERATORS = [{ slug: 'demo', name: 'Démo (simulation)', otp_required: false }]

const CACHE_TTL_MS = 60 * 60 * 1000
interface CacheEntry {
  value: unknown
  at: number
}
// Cache scopé par instance SebpayClient (WeakMap) plutôt que par clé globale :
// getSebpay() renvoie un singleton en production (même comportement de cache),
// mais chaque appelant/test avec sa propre instance obtient un cache isolé.
const cacheByClient = new WeakMap<SebpayClient, Map<string, CacheEntry>>()

async function cached<T>(sebpay: SebpayClient, key: string, loader: () => Promise<T>): Promise<T> {
  const clientCache = cacheByClient.get(sebpay) ?? new Map<string, CacheEntry>()
  cacheByClient.set(sebpay, clientCache)
  const entry = clientCache.get(key)
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry.value as T
  const value = await loader()
  clientCache.set(key, { value, at: Date.now() })
  return value
}

export async function getCountriesList(sebpay: SebpayClient | null): Promise<HttpResult> {
  if (!sebpay) return ok({ countries: FALLBACK_COUNTRIES })
  try {
    const countries = await cached(sebpay, 'countries', () => sebpay.getCountries())
    return ok({ countries })
  } catch {
    return ok({ countries: FALLBACK_COUNTRIES })
  }
}

export async function getOperatorsList(sebpay: SebpayClient | null, country: string): Promise<HttpResult> {
  if (!sebpay) return ok({ operators: FALLBACK_OPERATORS })
  try {
    const operators = await cached(sebpay, `operators:${country}`, () => sebpay.getOperators(country))
    return ok({ operators })
  } catch {
    return ok({ operators: FALLBACK_OPERATORS })
  }
}
