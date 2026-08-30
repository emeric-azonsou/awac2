import { describe, it, expect } from 'vitest'
import {
  getCountriesList,
  getOperatorsList,
  NETWORKS_BY_COUNTRY,
  FALLBACK_OPERATORS,
  getNetworkSlugs,
} from '../../server/services/payment'
describe('getCountriesList', () => {
  it('renvoie les 7 pays FeexPay, Bénin en premier', () => {
    const res = getCountriesList()
    expect(res.status).toBe(200)
    const { countries } = res.body as { countries: { country_code: string; prefix: string }[] }
    expect(countries.map((c) => c.country_code)).toEqual([
      'BJ',
      'TG',
      'CI',
      'SN',
      'BF',
      'ML',
      'CG',
    ])
    expect(countries[0]).toMatchObject({ country_code: 'BJ', prefix: '+229' })
  })
  it('donne la devise XAF au Congo Brazzaville et XOF ailleurs', () => {
    const res = getCountriesList()
    const { countries } = res.body as {
      countries: { country_code: string; currency: { code: string } }[]
    }
    for (const country of countries) {
      expect(country.currency.code).toBe(country.country_code === 'CG' ? 'XAF' : 'XOF')
    }
  })
})
describe('getOperatorsList', () => {
  it('renvoie les réseaux du pays demandé en mode réel', () => {
    expect((getOperatorsList(true, 'BJ').body as { operators: unknown[] }).operators).toEqual(
      NETWORKS_BY_COUNTRY.BJ,
    )
    expect(
      (getOperatorsList(true, 'CI').body as { operators: { slug: string }[] }).operators.map(
        (o) => o.slug,
      ),
    ).toEqual(['mtn_ci', 'moov_ci', 'orange_ci', 'wave_ci'])
  })
  it('renvoie une liste vide pour un pays non pris en charge en mode réel', () => {
    const res = getOperatorsList(true, 'NG')
    expect((res.body as { operators: unknown[] }).operators).toEqual([])
  })
  it('renvoie l’opérateur démo en mode simulé', () => {
    const res = getOperatorsList(false, 'BJ')
    expect((res.body as { operators: unknown[] }).operators).toEqual(FALLBACK_OPERATORS)
  })
})
describe('getNetworkSlugs', () => {
  it('expose tous les slugs de tous les pays (whitelist serveur)', () => {
    const slugs = getNetworkSlugs()
    expect(slugs).toEqual(
      expect.arrayContaining([
        'mtn',
        'moov',
        'celtiis_bj',
        'coris',
        'togocom_tg',
        'moov_tg',
        'mtn_ci',
        'moov_ci',
        'orange_ci',
        'wave_ci',
        'mtn_cg',
        'orange_sn',
        'wave_sn',
        'free_sn',
        'moov_bf',
        'orange_bf',
        'wave_bf',
        'orange_ml',
        'mobicash_ml',
      ]),
    )
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
