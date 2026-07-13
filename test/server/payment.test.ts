import { describe, it, expect, vi } from 'vitest'
import { getCountriesList, getOperatorsList, FALLBACK_COUNTRIES } from '../../server/services/payment'
import type { SebpayClient } from '../../server/types'

const asSebpay = (o: unknown): SebpayClient => o as unknown as SebpayClient

describe('getCountriesList', () => {
  it('renvoie le fallback si SebPay non configuré', async () => {
    const res = await getCountriesList(null)
    expect(res.status).toBe(200)
    expect((res.body as { countries: unknown[] }).countries).toEqual(FALLBACK_COUNTRIES)
  })

  it('renvoie les pays SebPay quand dispo', async () => {
    const getCountries = vi.fn().mockResolvedValue([{ country_code: 'BJ', prefix: '+229' }])
    const res = await getCountriesList(asSebpay({ getCountries }))
    expect((res.body as { countries: { country_code: string }[] }).countries[0]!.country_code).toBe('BJ')
  })

  it('retombe sur le fallback si SebPay lève', async () => {
    const getCountries = vi.fn().mockRejectedValue(new Error('boom'))
    const res = await getCountriesList(asSebpay({ getCountries }))
    expect((res.body as { countries: unknown[] }).countries).toEqual(FALLBACK_COUNTRIES)
  })
})

describe('getOperatorsList', () => {
  it('interroge SebPay filtré par pays', async () => {
    const getOperators = vi.fn().mockResolvedValue([{ slug: 'mtn' }])
    const res = await getOperatorsList(asSebpay({ getOperators }), 'BJ')
    expect((res.body as { operators: { slug: string }[] }).operators[0]!.slug).toBe('mtn')
    expect(getOperators).toHaveBeenCalledWith('BJ')
  })
})
