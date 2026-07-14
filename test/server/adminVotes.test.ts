import { describe, it, expect } from 'vitest'
import { listAdminVotes } from '../../server/services/admin/votes'
import { recordingDb, asDb } from './helpers'
import type { Db } from '../../server/types'

const CANDIDATE_ID = '6a3c0e1f-2b4d-4f5a-9c8e-1d2f3a4b5c6d'

function makeDb() {
  return recordingDb((sql) => {
    if (sql.includes('GROUP BY payment_status')) {
      return [
        { payment_status: 'confirmed', count: 4, amount: 1200 },
        { payment_status: 'pending', count: 2, amount: 300 },
      ]
    }
    if (sql.includes('COUNT(*)') && sql.includes('FROM votes')) {
      return [{ total: 12 }]
    }
    if (sql.includes('FROM votes') && sql.includes('JOIN candidates')) {
      return [
        {
          id: 'v1',
          receipt_code: 'AWAC-1700000000000-ABCD1234',
          candidate_name: 'Awa Bocovo',
          quantity: 3,
          total_amount: 300,
          currency: 'XOF',
          payment_status: 'confirmed',
          payment_provider: 'mtn',
          created_at: '2026-07-14T09:00:00Z',
        },
      ]
    }
    return []
  })
}

describe('listAdminVotes', () => {
  it('renvoie votes paginés, total et agrégats par statut', async () => {
    const db = makeDb()
    const res = await listAdminVotes({ db: asDb(db) as unknown as Db }, {})
    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    expect((body.votes as unknown[]).length).toBe(1)
    expect(body.total).toBe(12)
    expect(body.page).toBe(1)
    expect(body.totals_by_status).toEqual({
      confirmed: { count: 4, amount: 1200 },
      pending: { count: 2, amount: 300 },
      rejected: { count: 0, amount: 0 },
    })
  })

  it('applique le filtre de statut en paramètre lié', async () => {
    const db = makeDb()
    await listAdminVotes({ db: asDb(db) as unknown as Db }, { status: 'confirmed' })
    const listCall = db.calls.find(
      (c) => c.sql.includes('FROM votes') && c.sql.includes('JOIN candidates'),
    )
    expect(listCall?.params).toContain('confirmed')
  })

  it('ignore un statut invalide (pas de filtre injecté)', async () => {
    const db = makeDb()
    await listAdminVotes(
      { db: asDb(db) as unknown as Db },
      { status: "confirmed'; DROP TABLE votes;--" },
    )
    const listCall = db.calls.find(
      (c) => c.sql.includes('FROM votes') && c.sql.includes('JOIN candidates'),
    )
    expect(listCall?.params).not.toContain("confirmed'; DROP TABLE votes;--")
  })

  it('applique le filtre candidat et la recherche par code reçu en paramètres liés', async () => {
    const db = makeDb()
    await listAdminVotes(
      { db: asDb(db) as unknown as Db },
      { candidateId: CANDIDATE_ID, search: 'AWAC-17' },
    )
    const listCall = db.calls.find(
      (c) => c.sql.includes('FROM votes') && c.sql.includes('JOIN candidates'),
    )
    expect(listCall?.params).toContain(CANDIDATE_ID)
    expect(listCall?.params.some((p) => String(p).includes('AWAC-17'))).toBe(true)
  })

  it('borne la pagination (page ≥ 1, limite plafonnée)', async () => {
    const db = makeDb()
    const res = await listAdminVotes({ db: asDb(db) as unknown as Db }, { page: -5, limit: 9999 })
    const body = res.body as Record<string, unknown>
    expect(body.page).toBe(1)
    expect(body.per_page).toBeLessThanOrEqual(100)
  })
})
