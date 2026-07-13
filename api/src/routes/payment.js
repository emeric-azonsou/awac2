import { Hono } from 'hono'

// Liste de repli quand SebPay n'est pas configuré (dev sans clés) :
// permet de voter en mode simulé.
const FALLBACK_COUNTRIES = [
  { country_code: 'BJ', country_name: 'Bénin', prefix: '+229', currency: { code: 'XOF', name: 'Franc CFA' } },
]
const FALLBACK_OPERATORS = [
  { slug: 'demo', name: 'Démo (simulation)', otp_required: false },
]

// Cache mémoire léger : les listes pays/opérateurs bougent rarement,
// inutile de taper SebPay à chaque affichage du formulaire.
const CACHE_TTL_MS = 60 * 60 * 1000
const cache = new Map()

async function cached(key, loader) {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry.value
  const value = await loader()
  cache.set(key, { value, at: Date.now() })
  return value
}

const router = new Hono()

router.get('/countries', async (c) => {
  const sebpay = c.get('sebpay')
  if (!sebpay) return c.json({ countries: FALLBACK_COUNTRIES })
  try {
    const countries = await cached('countries', () => sebpay.getCountries())
    return c.json({ countries })
  } catch {
    return c.json({ countries: FALLBACK_COUNTRIES })
  }
})

router.get('/operators', async (c) => {
  const sebpay = c.get('sebpay')
  const country = c.req.query('country') || 'BJ'
  if (!sebpay) return c.json({ operators: FALLBACK_OPERATORS })
  try {
    const operators = await cached(`operators:${country}`, () => sebpay.getOperators(country))
    return c.json({ operators })
  } catch {
    return c.json({ operators: FALLBACK_OPERATORS })
  }
})

export default router
