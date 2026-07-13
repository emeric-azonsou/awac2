import { describe, it, expect } from 'vitest'
import { buildTestApp, recordingDb, readJson } from './helpers.ts'
import settingsRouter from '../src/routes/settings.ts'

describe('settings public route', () => {
  it('GET /settings/public expose uniquement prix et devise', async () => {
    const db = recordingDb([
      { vote_unit_price: 100, currency: 'XOF' },
    ])
    const app = buildTestApp({ db }, (a) => a.route('/settings', settingsRouter))
    const res = await app.request('/settings/public')
    expect(res.status).toBe(200)
    expect(await readJson(res)).toEqual({ vote_unit_price: 100, currency: 'XOF' })
  })
})
