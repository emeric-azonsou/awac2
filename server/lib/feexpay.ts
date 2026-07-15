import crypto from 'node:crypto'
import type {
  FeexpayClient,
  PaymentInitInput,
  PaymentInitResult,
  PaymentStatusResult,
} from '../types'
const DEFAULT_BASE_URL = 'https://api-v2.feexpay.me'
const BENIN_DIAL_CODE = '229'
const BENIN_LOCAL_NUMBER_LENGTH = 10
const BENIN_LEGACY_LOCAL_NUMBER_LENGTH = 8
const BENIN_LEGACY_LOCAL_PREFIX = '01'
const INTERNATIONAL_CALL_PREFIX = '00'
export function toFeexpayPhone(digits: string): string {
  let phone = digits.replace(/[^0-9]/g, '')
  if (phone.startsWith(INTERNATIONAL_CALL_PREFIX)) {
    phone = phone.slice(INTERNATIONAL_CALL_PREFIX.length)
  }
  if (phone.length === BENIN_LEGACY_LOCAL_NUMBER_LENGTH) {
    phone = `${BENIN_LEGACY_LOCAL_PREFIX}${phone}`
  }
  if (phone.length === BENIN_LOCAL_NUMBER_LENGTH && phone.startsWith(BENIN_LEGACY_LOCAL_PREFIX)) {
    phone = `${BENIN_DIAL_CODE}${phone}`
  }
  if (phone.startsWith(BENIN_DIAL_CODE)) {
    const local = phone.slice(BENIN_DIAL_CODE.length)
    if (local.length === BENIN_LEGACY_LOCAL_NUMBER_LENGTH) {
      phone = `${BENIN_DIAL_CODE}${BENIN_LEGACY_LOCAL_PREFIX}${local}`
    }
  }
  return phone
}
export function verifyWebhookToken(token: string | null | undefined, secret: string): boolean {
  if (typeof token !== 'string' || token.length === 0 || secret.length === 0) return false
  const tokenHash = crypto.createHash('sha256').update(token).digest()
  const secretHash = crypto.createHash('sha256').update(secret).digest()
  return crypto.timingSafeEqual(tokenHash, secretHash)
}
export function createFeexpayFromEnv(env: NodeJS.ProcessEnv = process.env): FeexpayClient | null {
  const apiKey = env.FEEXPAY_API_KEY
  const shopId = env.FEEXPAY_SHOP_ID
  if (!apiKey || !shopId) return null
  return createFeexpayClient({
    baseUrl: env.FEEXPAY_BASE_URL || DEFAULT_BASE_URL,
    apiKey,
    shopId,
  })
}
interface FeexpayClientConfig {
  baseUrl: string
  apiKey: string
  shopId: string
  fetch?: typeof globalThis.fetch
}
export function createFeexpayClient({
  baseUrl,
  apiKey,
  shopId,
  fetch = globalThis.fetch,
}: FeexpayClientConfig): FeexpayClient {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  async function readJson<T extends { message?: string }>(
    response: Response,
    context: string,
  ): Promise<T> {
    const payload = (await response.json().catch(() => null)) as T | null
    if (!response.ok || !payload) {
      const message = payload?.message || `Statut ${response.status}`
      throw new Error(`FeexPay ${context} a échoué : ${message}`)
    }
    return payload
  }
  return {
    async initPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
      const response = await fetch(
        `${baseUrl}/api/transactions/public/requesttopay/${encodeURIComponent(input.network)}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            shop: shopId,
            amount: input.amount,
            phoneNumber: input.phoneNumber,
            callback_info: input.callbackInfo,
          }),
        },
      )
      const payload = await readJson<PaymentInitResult & { message?: string }>(
        response,
        'requesttopay',
      )
      if (!payload.reference) {
        throw new Error(`FeexPay requesttopay a échoué : ${payload.message || 'référence absente'}`)
      }
      return payload
    },
    async getPaymentStatus(reference: string): Promise<PaymentStatusResult> {
      const response = await fetch(
        `${baseUrl}/api/transactions/public/single/status/${encodeURIComponent(reference)}`,
        { method: 'GET', headers },
      )
      return readJson<PaymentStatusResult & { message?: string }>(response, 'status')
    },
  }
}
