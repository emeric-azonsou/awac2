import { describe, it, expect } from 'vitest'
import { recordingDb, asDb } from './helpers'
import { getPublicSettings } from '../../server/services/settings'
describe('getPublicSettings', () => {
  it('expose uniquement prix et devise (200)', async () => {
    const db = recordingDb([{ vote_unit_price: 100, currency: 'XOF' }])
    const res = await getPublicSettings(asDb(db))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ vote_unit_price: 100, currency: 'XOF' })
  })
  it('renvoie null/null si aucun réglage', async () => {
    const db = recordingDb([])
    const res = await getPublicSettings(asDb(db))
    expect(res.body).toEqual({ vote_unit_price: null, currency: null })
  })
})
