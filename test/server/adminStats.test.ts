import { describe, it, expect } from 'vitest'
import { getAdminStats } from '../../server/services/admin/stats'
import { asDb } from './helpers'
import type { Db } from '../../server/types'
function makeDb({ empty = false } = {}) {
  const db = ((strings: TemplateStringsArray) => {
    const sql = strings.join('?')
    if (sql.includes('GROUP BY payment_status')) {
      return Promise.resolve(
        empty
          ? []
          : [
              { payment_status: 'confirmed', votes_count: 4, voices_total: 12, amount_total: 1200 },
              { payment_status: 'pending', votes_count: 2, voices_total: 3, amount_total: 300 },
              { payment_status: 'rejected', votes_count: 1, voices_total: 5, amount_total: 500 },
            ],
      )
    }
    if (sql.includes('FROM candidates') && sql.includes('ORDER BY')) {
      return Promise.resolve(
        empty
          ? []
          : [
              { id: 'c1', full_name: 'Awa Bocovo', vote_count: 16 },
              { id: 'c2', full_name: 'Kofi Dossou', vote_count: 7 },
            ],
      )
    }
    if (sql.includes('COUNT(*)') && sql.includes('FROM candidates')) {
      return Promise.resolve([{ total: empty ? 0 : 6 }])
    }
    return Promise.resolve([])
  }) as unknown as Db
  return db
}
describe('getAdminStats', () => {
  it('agrège revenus confirmés, voix, statuts et top candidats', async () => {
    const res = await getAdminStats({ db: asDb(makeDb()) as unknown as Db })
    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    expect(body.revenue_fcfa).toBe(1200)
    expect(body.voices_confirmed).toBe(12)
    expect(body.candidates_count).toBe(6)
    expect(body.votes_by_status).toEqual({
      confirmed: { count: 4, amount: 1200 },
      pending: { count: 2, amount: 300 },
      rejected: { count: 1, amount: 500 },
    })
    expect(body.top_candidates).toEqual([
      { id: 'c1', full_name: 'Awa Bocovo', vote_count: 16 },
      { id: 'c2', full_name: 'Kofi Dossou', vote_count: 7 },
    ])
  })
  it('renvoie des zéros propres sur une base vide (pas de null)', async () => {
    const res = await getAdminStats({ db: asDb(makeDb({ empty: true })) as unknown as Db })
    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    expect(body.revenue_fcfa).toBe(0)
    expect(body.voices_confirmed).toBe(0)
    expect(body.candidates_count).toBe(0)
    expect(body.votes_by_status).toEqual({
      confirmed: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
    })
    expect(body.top_candidates).toEqual([])
  })
})
