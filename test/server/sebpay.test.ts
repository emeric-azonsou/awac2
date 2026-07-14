import { describe, it, expect, vi } from 'vitest'
import crypto from 'node:crypto'
import { createSebpayClient, verifyWebhookSignature } from '../../server/lib/sebpay'
const CONFIG = {
  baseUrl: 'https://newapi.sebpay.test/api/v1',
  publicKey: 'pk_test_abc',
  secretKey: 'sk_test_xyz',
}
function signBody(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}
type FetchLike = typeof globalThis.fetch
describe('verifyWebhookSignature', () => {
  it('accepte une signature valide', () => {
    const body = JSON.stringify({ transaction_id: 't1', status: 'approved' })
    const sig = signBody(body, CONFIG.secretKey)
    expect(verifyWebhookSignature(body, sig, CONFIG.secretKey)).toBe(true)
  })
  it('rejette une signature falsifiée', () => {
    const body = JSON.stringify({ transaction_id: 't1', status: 'approved' })
    expect(verifyWebhookSignature(body, 'deadbeef', CONFIG.secretKey)).toBe(false)
  })
  it('rejette une signature signée avec la mauvaise clé', () => {
    const body = JSON.stringify({ status: 'approved' })
    const sig = signBody(body, 'sk_test_autre')
    expect(verifyWebhookSignature(body, sig, CONFIG.secretKey)).toBe(false)
  })
  it('rejette une signature absente ou malformée', () => {
    expect(verifyWebhookSignature('{}', null, CONFIG.secretKey)).toBe(false)
    expect(verifyWebhookSignature('{}', '', CONFIG.secretKey)).toBe(false)
    expect(verifyWebhookSignature('{}', 'xyz', CONFIG.secretKey)).toBe(false)
  })
})
describe('createSebpayClient.createCollection', () => {
  it('envoie les bons en-têtes et le bon corps, renvoie data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          transaction_id: 'sp_1',
          status: 'pending',
          external_reference: 'AWAC-1',
          provider_link: null,
        },
      }),
    })
    const client = createSebpayClient({ ...CONFIG, fetch: fetchMock as unknown as FetchLike })
    const result = await client.createCollection({
      amount: 300,
      currency: 'XOF',
      phone: '22997000000',
      operator: 'mtn',
      country: 'BJ',
      externalReference: 'AWAC-1',
      callbackUrl: 'https://awac.test/votes/webhook',
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://newapi.sebpay.test/api/v1/collections')
    expect(options.method).toBe('POST')
    expect(options.headers['X-Public-Key']).toBe('pk_test_abc')
    expect(options.headers['X-Secret-Key']).toBe('sk_test_xyz')
    const sentBody = JSON.parse(options.body)
    expect(sentBody).toMatchObject({
      amount: 300,
      currency: 'XOF',
      phone: '22997000000',
      operator: 'mtn',
      country: 'BJ',
      external_reference: 'AWAC-1',
      callback_url: 'https://awac.test/votes/webhook',
    })
    expect(result.transaction_id).toBe('sp_1')
    expect(result.status).toBe('pending')
  })
  it('lève une erreur si SebPay renvoie un échec', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ success: false, message: 'Numéro invalide' }),
    })
    const client = createSebpayClient({ ...CONFIG, fetch: fetchMock as unknown as FetchLike })
    await expect(
      client.createCollection({
        amount: 1,
        currency: 'XOF',
        phone: 'x',
        operator: 'mtn',
        externalReference: 'r',
        callbackUrl: 'u',
      }),
    ).rejects.toThrow(/SebPay/)
  })
})
describe('createSebpayClient.getCollection', () => {
  it('interroge le statut par référence', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { transaction_id: 'sp_1', status: 'approved', external_reference: 'AWAC-1' },
      }),
    })
    const client = createSebpayClient({ ...CONFIG, fetch: fetchMock as unknown as FetchLike })
    const result = await client.getCollection('AWAC-1')
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://newapi.sebpay.test/api/v1/collections/AWAC-1')
    expect(options.method).toBe('GET')
    expect(result.status).toBe('approved')
  })
})
describe('createSebpayClient.getCountries / getOperators', () => {
  it('récupère la liste des pays (clé countries)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { countries: [{ country_code: 'BJ', prefix: '+229' }] },
      }),
    })
    const client = createSebpayClient({ ...CONFIG, fetch: fetchMock as unknown as FetchLike })
    const countries = await client.getCountries()
    expect(fetchMock.mock.calls[0]![0]).toBe('https://newapi.sebpay.test/api/v1/countries')
    expect(countries[0]!.country_code).toBe('BJ')
  })
  it('récupère les opérateurs filtrés par pays', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ slug: 'mtn', name: 'MTN', otp_required: false }],
      }),
    })
    const client = createSebpayClient({ ...CONFIG, fetch: fetchMock as unknown as FetchLike })
    const operators = await client.getOperators('BJ')
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://newapi.sebpay.test/api/v1/operators?country=BJ',
    )
    expect(operators[0]!.slug).toBe('mtn')
  })
})
