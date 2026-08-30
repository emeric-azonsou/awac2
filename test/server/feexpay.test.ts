import { describe, it, expect, vi } from 'vitest'
import {
  createFeexpayClient,
  createFeexpayFromEnv,
  verifyWebhookToken,
  toFeexpayPhone,
} from '../../server/lib/feexpay'
const CONFIG = {
  baseUrl: 'https://api-v2.feexpay.test',
  apiKey: 'fp_test_abc',
  shopId: 'shop_123',
}
type FetchLike = typeof globalThis.fetch
describe('toFeexpayPhone', () => {
  it('garde un numéro déjà au format 229 + 10 chiffres', () => {
    expect(toFeexpayPhone('2290166000000')).toBe('2290166000000')
  })
  it('préfixe 229 sur un numéro local à 10 chiffres (01…)', () => {
    expect(toFeexpayPhone('0166000000')).toBe('2290166000000')
  })
  it('convertit un ancien numéro à 8 chiffres en 229 + 01 + numéro', () => {
    expect(toFeexpayPhone('97000000')).toBe('2290197000000')
  })
  it('gère le préfixe international 00229', () => {
    expect(toFeexpayPhone('002290166000000')).toBe('2290166000000')
  })
  it('convertit 229 + 8 chiffres (ancien format international)', () => {
    expect(toFeexpayPhone('22997000000')).toBe('2290197000000')
  })
  it('laisse intact un numéro ivoirien avec indicatif 225', () => {
    expect(toFeexpayPhone('+2250701234567')).toBe('2250701234567')
  })
  it('laisse intact un numéro sénégalais avec indicatif 221', () => {
    expect(toFeexpayPhone('221771234567')).toBe('221771234567')
  })
  it('gère le préfixe international 00 pour un autre pays (00228…)', () => {
    expect(toFeexpayPhone('0022890123456')).toBe('22890123456')
  })
})
describe('verifyWebhookToken', () => {
  it('accepte le bon token', () => {
    expect(verifyWebhookToken('tok_secret', 'tok_secret')).toBe(true)
  })
  it('rejette un mauvais token', () => {
    expect(verifyWebhookToken('tok_faux', 'tok_secret')).toBe(false)
  })
  it('rejette un token absent ou un secret vide', () => {
    expect(verifyWebhookToken(null, 'tok_secret')).toBe(false)
    expect(verifyWebhookToken('', 'tok_secret')).toBe(false)
    expect(verifyWebhookToken('tok_secret', '')).toBe(false)
  })
})
describe('createFeexpayFromEnv', () => {
  it('renvoie null sans clé API ou sans shop', () => {
    expect(createFeexpayFromEnv({} as NodeJS.ProcessEnv)).toBeNull()
    expect(createFeexpayFromEnv({ FEEXPAY_API_KEY: 'k' } as NodeJS.ProcessEnv)).toBeNull()
    expect(createFeexpayFromEnv({ FEEXPAY_SHOP_ID: 's' } as NodeJS.ProcessEnv)).toBeNull()
  })
  it('crée un client quand clé + shop présents', () => {
    const client = createFeexpayFromEnv({
      FEEXPAY_API_KEY: 'k',
      FEEXPAY_SHOP_ID: 's',
    } as NodeJS.ProcessEnv)
    expect(client).not.toBeNull()
  })
})
describe('createFeexpayClient.initPayment', () => {
  it('appelle requesttopay/{network} avec Bearer et le bon corps', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reference: 'fx_ref_1',
        message: 'Accepted',
        status: 'PENDING',
        amount: 300,
      }),
    })
    const client = createFeexpayClient({ ...CONFIG, fetch: fetchMock as unknown as FetchLike })
    const result = await client.initPayment({
      amount: 300,
      network: 'mtn',
      phoneNumber: '2290166000000',
      callbackInfo: 'AWAC-1',
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api-v2.feexpay.test/api/transactions/public/requesttopay/mtn')
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toBe('Bearer fp_test_abc')
    const sentBody = JSON.parse(options.body)
    expect(sentBody).toMatchObject({
      shop: 'shop_123',
      amount: 300,
      phoneNumber: '2290166000000',
      callback_info: 'AWAC-1',
    })
    expect(result.reference).toBe('fx_ref_1')
    expect(result.status).toBe('PENDING')
  })
  it('encode le slug réseau dans l’URL (celtiis_bj)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reference: 'fx_2', status: 'PENDING' }),
    })
    const client = createFeexpayClient({ ...CONFIG, fetch: fetchMock as unknown as FetchLike })
    await client.initPayment({
      amount: 100,
      network: 'celtiis_bj',
      phoneNumber: '2290166000000',
      callbackInfo: 'AWAC-2',
    })
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://api-v2.feexpay.test/api/transactions/public/requesttopay/celtiis_bj',
    )
  })
  it('lève une erreur si FeexPay répond en échec HTTP', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ message: 'Numéro invalide' }),
    })
    const client = createFeexpayClient({ ...CONFIG, fetch: fetchMock as unknown as FetchLike })
    await expect(
      client.initPayment({
        amount: 100,
        network: 'mtn',
        phoneNumber: 'x',
        callbackInfo: 'r',
      }),
    ).rejects.toThrow(/FeexPay/)
  })
  it('lève une erreur si la réponse ne contient pas de référence', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'oops' }),
    })
    const client = createFeexpayClient({ ...CONFIG, fetch: fetchMock as unknown as FetchLike })
    await expect(
      client.initPayment({
        amount: 100,
        network: 'mtn',
        phoneNumber: '2290166000000',
        callbackInfo: 'r',
      }),
    ).rejects.toThrow(/FeexPay/)
  })
})
describe('createFeexpayClient.getPaymentStatus', () => {
  it('interroge le statut par référence FeexPay avec Bearer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reference: 'fx_ref_1',
        status: 'SUCCESSFUL',
        amount: 300,
        reason: '',
      }),
    })
    const client = createFeexpayClient({ ...CONFIG, fetch: fetchMock as unknown as FetchLike })
    const result = await client.getPaymentStatus('fx_ref_1')
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api-v2.feexpay.test/api/transactions/public/single/status/fx_ref_1')
    expect(options.method).toBe('GET')
    expect(options.headers.Authorization).toBe('Bearer fp_test_abc')
    expect(result.status).toBe('SUCCESSFUL')
    expect(result.amount).toBe(300)
  })
  it('lève une erreur sur réponse HTTP en échec', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'not found' }),
    })
    const client = createFeexpayClient({ ...CONFIG, fetch: fetchMock as unknown as FetchLike })
    await expect(client.getPaymentStatus('inconnu')).rejects.toThrow(/FeexPay/)
  })
})
