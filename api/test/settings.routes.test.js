import { describe, it, expect } from 'vitest'
import { buildTestApp, recordingDb } from './helpers.js'
import settingsRouter from '../src/routes/settings.js'

describe('settings public route', () => {
  it('GET /settings/public expose uniquement prix et devise', async () => {
    const db = recordingDb([
      { vote_unit_price: 100, currency: 'XOF' },
    ])
    const app = buildTestApp({ db }, (a) => a.route('/settings', settingsRouter))
    const res = await app.request('/settings/public')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ vote_unit_price: 100, currency: 'XOF' })
  })
})
