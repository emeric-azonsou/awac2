import { describe, it, expect } from 'vitest'
import { recordingDb, asDb } from './helpers'
import { getPublicSettings } from '../../server/services/settings'
describe('getPublicSettings', () => {
  it('expose uniquement prix et devise (200)', async () => {
    const db = recordingDb([{ vote_unit_price: 100, currency: 'XOF' }])
    const res = await getPublicSettings(asDb(db), () => new Date('2026-08-14T22:59:58Z'))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      vote_unit_price: 100,
      currency: 'XOF',
      server_time: '2026-08-14T22:59:58.000Z',
      voting_closed: false,
    })
  })
  it('renvoie null/null si aucun réglage', async () => {
    const db = recordingDb([])
    const res = await getPublicSettings(asDb(db))
    expect(res.body).toMatchObject({ vote_unit_price: null, currency: null })
  })

  it('annonce la clôture selon heure serveur exacte', async () => {
    const db = recordingDb([{ vote_unit_price: 100, currency: 'XOF' }])
    const res = await getPublicSettings(asDb(db), () => new Date('2026-08-14T22:59:59Z'))
    expect(res.body).toMatchObject({
      server_time: '2026-08-14T22:59:59.000Z',
      voting_closed: true,
    })
  })
})
