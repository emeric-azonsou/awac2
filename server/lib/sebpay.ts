import crypto from 'node:crypto'
import type {
  SebpayClient,
  SebpayCollection,
  SebpayCollectionInput,
  SebpayCountry,
  SebpayOperator,
} from '../types'
const DEFAULT_COUNTRY_CODE = 'BJ'
const DEFAULT_BASE_URL = 'https://newapi.sebpay.bj/api/v1'
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secretKey: string,
): boolean {
  if (typeof signature !== 'string' || signature.length === 0) return false
  const expected = crypto.createHmac('sha256', secretKey).update(rawBody).digest('hex')
  if (signature.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'))
}

export function createSebpayFromEnv(env: NodeJS.ProcessEnv = process.env): SebpayClient | null {
  const secretKey = env.SEBPAY_SECRET_KEY
  const publicKey = env.SEBPAY_PUBLIC_KEY
  if (!secretKey || !publicKey) return null
  return createSebpayClient({
    baseUrl: env.SEBPAY_BASE_URL || DEFAULT_BASE_URL,
    publicKey,
    secretKey,
  })
}
interface SebpayClientConfig {
  baseUrl: string
  publicKey: string
  secretKey: string
  fetch?: typeof globalThis.fetch
}
interface SebpayEnvelope<T> {
  success?: boolean
  message?: string
  data?: T
}
export function createSebpayClient({
  baseUrl,
  publicKey,
  secretKey,
  fetch = globalThis.fetch,
}: SebpayClientConfig): SebpayClient {
  const headers = {
    'X-Public-Key': publicKey,
    'X-Secret-Key': secretKey,
    'Content-Type': 'application/json',
  }
  async function readData<T>(response: Response, context: string): Promise<T> {
    const payload = (await response.json().catch(() => null)) as SebpayEnvelope<T> | null
    if (!response.ok || !payload?.success) {
      const message = payload?.message || `Statut ${response.status}`
      throw new Error(`SebPay ${context} a échoué : ${message}`)
    }
    return payload.data as T
  }
  return {
    async createCollection(input: SebpayCollectionInput): Promise<SebpayCollection> {
      const response = await fetch(`${baseUrl}/collections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: input.amount,
          currency: input.currency,
          phone: input.phone,
          operator: input.operator,
          country: input.country || DEFAULT_COUNTRY_CODE,
          external_reference: input.externalReference,
          callback_url: input.callbackUrl,
        }),
      })
      return readData<SebpayCollection>(response, 'collections')
    },
    async getCollection(reference: string): Promise<SebpayCollection> {
      const response = await fetch(`${baseUrl}/collections/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers,
      })
      return readData<SebpayCollection>(response, 'status')
    },
    async getCountries(): Promise<SebpayCountry[]> {
      const response = await fetch(`${baseUrl}/countries`, { method: 'GET', headers })
      const data = await readData<SebpayCountry[] | { countries?: SebpayCountry[] }>(
        response,
        'countries',
      )
      return Array.isArray(data) ? data : (data?.countries ?? [])
    },
    async getOperators(country?: string): Promise<SebpayOperator[]> {
      const query = country ? `?country=${encodeURIComponent(country)}` : ''
      const response = await fetch(`${baseUrl}/operators${query}`, { method: 'GET', headers })
      const data = await readData<SebpayOperator[] | { operators?: SebpayOperator[] }>(
        response,
        'operators',
      )
      return Array.isArray(data) ? data : (data?.operators ?? [])
    },
  }
}
