import { describe, it, expect, vi } from 'vitest'
import { getReceipt } from '../../server/services/receipts'
import { asDb } from './helpers'
import type { Db, SebpayClient } from '../../server/types'

const RECEIPT_CODE = 'AWAC-1784013139890-AB12CD34'
const asSebpay = (o: unknown): SebpayClient => o as unknown as SebpayClient

function makeDb({ found = true, paymentStatus = 'confirmed', voteCount = 10 } = {}) {
  const state = { paymentStatus, voteCount, calls: [] as string[] }
  const run = (strings: TemplateStringsArray, params: unknown[]): unknown[] => {
    const sql = strings.join('?')
    state.calls.push(sql)
    if (sql.includes('FROM votes') && sql.includes('JOIN candidates')) {
      if (!found) return []
      return [
        {
          receipt_code: RECEIPT_CODE,
          payment_status: state.paymentStatus,
          quantity: 3,
          total_amount: 300,
          currency: 'XOF',
          created_at: '2026-07-14T07:00:00Z',
          candidate_name: 'Awa Bocovo',
          voter_phone: '+22901970000',
          votes_before: state.paymentStatus === 'confirmed' ? 10 : state.voteCount,
          votes_after: state.paymentStatus === 'confirmed' ? 13 : state.voteCount,
        },
      ]
    }
    if (sql.includes('FROM votes') && sql.includes('FOR UPDATE')) {
      return [
        {
          receipt_code: RECEIPT_CODE,
          candidate_id: 'c-1',
          quantity: 3,
          payment_status: state.paymentStatus,
          votes_before: state.voteCount,
          votes_after: state.voteCount,
        },
      ]
    }
    if (sql.includes('FROM candidates') && sql.includes('FOR UPDATE'))
      return [{ vote_count: state.voteCount }]
    if (sql.includes('UPDATE candidates')) {
      state.voteCount = params[0] as number
      return []
    }
    if (sql.includes('UPDATE votes')) {
      const terminal = params.find((p) => p === 'confirmed' || p === 'rejected')
      if (terminal) state.paymentStatus = terminal as string
      return []
    }
    return []
  }
  const db = ((strings: TemplateStringsArray, ...params: unknown[]) =>
    Promise.resolve(run(strings, params))) as {
    (strings: TemplateStringsArray, ...params: unknown[]): Promise<unknown[]>
    begin: (
      fn: (tx: (s: TemplateStringsArray, ...p: unknown[]) => Promise<unknown[]>) => unknown,
    ) => Promise<unknown>
    _state: typeof state
  }
  db.begin = async (fn) =>
    fn((strings: TemplateStringsArray, ...params: unknown[]) =>
      Promise.resolve(run(strings, params)),
    )
  db._state = state
  return db
}

describe('getReceipt', () => {
  it('renvoie le reçu public sans données personnelles (200)', async () => {
    const db = makeDb({ paymentStatus: 'confirmed' })
    const res = await getReceipt({ db: asDb(db) as unknown as Db, sebpay: null }, RECEIPT_CODE)
    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    expect(body.receipt_code).toBe(RECEIPT_CODE)
    expect(body.payment_status).toBe('confirmed')
    expect(body.candidate_name).toBe('Awa Bocovo')
    expect(body.quantity).toBe(3)
    expect(body.amount).toBe(300)
    expect(body.votes_before).toBe(10)
    expect(body.votes_after).toBe(13)
    expect(JSON.stringify(body)).not.toContain('2290197')
    expect(body.voter_phone).toBeUndefined()
  })

  it("ne montre pas d'avant/après tant que le vote n'est pas confirmé", async () => {
    const db = makeDb({ paymentStatus: 'pending' })
    const res = await getReceipt({ db: asDb(db) as unknown as Db, sebpay: null }, RECEIPT_CODE)
    const body = res.body as Record<string, unknown>
    expect(body.votes_before).toBeNull()
    expect(body.votes_after).toBeNull()
  })

  it('renvoie 404 pour un code inconnu', async () => {
    const db = makeDb({ found: false })
    const res = await getReceipt({ db: asDb(db) as unknown as Db, sebpay: null }, RECEIPT_CODE)
    expect(res.status).toBe(404)
  })

  it('renvoie 404 pour un code au format invalide, sans requête en base', async () => {
    const db = makeDb()
    for (const code of ['', 'abc', "AWAC-1'; DROP TABLE votes;--", 'AWAC-<script>']) {
      const res = await getReceipt({ db: asDb(db) as unknown as Db, sebpay: null }, code)
      expect(res.status).toBe(404)
    }
    expect(db._state.calls.length).toBe(0)
  })

  it('réconcilie un reçu pending auprès de SebPay et le confirme (vote tardif)', async () => {
    const db = makeDb({ paymentStatus: 'pending' })
    const getCollection = vi.fn().mockResolvedValue({ transaction_id: 'sp_9', status: 'approved' })
    const res = await getReceipt(
      { db: asDb(db) as unknown as Db, sebpay: asSebpay({ getCollection }) },
      RECEIPT_CODE,
    )
    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    expect(body.payment_status).toBe('confirmed')
    expect(body.votes_before).toBe(10)
    expect(body.votes_after).toBe(13)
    expect(db._state.voteCount).toBe(13)
    expect(getCollection).toHaveBeenCalledWith(RECEIPT_CODE)
  })

  it('reste pending si SebPay est injoignable (200)', async () => {
    const db = makeDb({ paymentStatus: 'pending' })
    const getCollection = vi.fn().mockRejectedValue(new Error('timeout'))
    const res = await getReceipt(
      { db: asDb(db) as unknown as Db, sebpay: asSebpay({ getCollection }) },
      RECEIPT_CODE,
    )
    expect(res.status).toBe(200)
    expect((res.body as { payment_status: string }).payment_status).toBe('pending')
  })
})
