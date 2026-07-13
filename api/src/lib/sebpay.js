import crypto from 'node:crypto'

const DEFAULT_COUNTRY_CODE = 'BJ'

export function verifyWebhookSignature(rawBody, signature, secretKey) {
  if (typeof signature !== 'string' || signature.length === 0) return false
  const expected = crypto.createHmac('sha256', secretKey).update(rawBody).digest('hex')
  if (signature.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'))
}

const DEFAULT_BASE_URL = 'https://newapi.sebpay.bj/api/v1'

// Construit un client depuis les variables d'environnement.
// Renvoie null si la clé secrète manque → l'API bascule en mode « paiement simulé ».
export function createSebpayFromEnv(env = process.env) {
  const secretKey = env.SEBPAY_SECRET_KEY
  const publicKey = env.SEBPAY_PUBLIC_KEY
  if (!secretKey || !publicKey) return null
  return createSebpayClient({
    baseUrl: env.SEBPAY_BASE_URL || DEFAULT_BASE_URL,
    publicKey,
    secretKey,
  })
}

export function createSebpayClient({ baseUrl, publicKey, secretKey, fetch = globalThis.fetch }) {
  const headers = {
    'X-Public-Key': publicKey,
    'X-Secret-Key': secretKey,
    'Content-Type': 'application/json',
  }

  async function readData(response, context) {
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.success) {
      const message = payload?.message || `Statut ${response.status}`
      throw new Error(`SebPay ${context} a échoué : ${message}`)
    }
    return payload.data
  }

  return {
    async createCollection({ amount, currency, phone, operator, country, externalReference, callbackUrl }) {
      const response = await fetch(`${baseUrl}/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount,
          currency,
          phone,
          operator,
          country: country || DEFAULT_COUNTRY_CODE,
          external_reference: externalReference,
          callback_url: callbackUrl,
        }),
      })
      return readData(response, 'collections')
    },

    async getCollection(reference) {
      const response = await fetch(`${baseUrl}/collections/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers,
      })
      return readData(response, 'status')
    },

    async getCountries() {
      const response = await fetch(`${baseUrl}/countries`, { method: 'GET', headers })
      const data = await readData(response, 'countries')
      return Array.isArray(data) ? data : (data?.countries ?? [])
    },

    async getOperators(country) {
      const query = country ? `?country=${encodeURIComponent(country)}` : ''
      const response = await fetch(`${baseUrl}/operators${query}`, { method: 'GET', headers })
      const data = await readData(response, 'operators')
      return Array.isArray(data) ? data : (data?.operators ?? [])
    },
  }
}
