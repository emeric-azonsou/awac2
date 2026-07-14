import { describe, it, expect, vi } from 'vitest'
import { reconcilePendingVotes } from '../../server/services/reconciliation'
import { asDb } from './helpers'
import type { Db, SebpayClient } from '../../server/types'
import type { LateConfirmationNotifier } from '../../server/lib/notifier'
const asSebpay = (o: unknown): SebpayClient => o as unknown as SebpayClient
interface StaleVote {
  receipt_code: string
  candidate_id: string
  quantity: number
  payment_status: string
  voter_phone: string
  total_amount: number
  currency: string
  candidate_name: string
}
function makeDb(staleVotes: Partial<StaleVote>[]) {
  const votes = staleVotes.map((vote, index) => ({
    receipt_code: `AWAC-170000000000${index}-CODE000${index}`,
    candidate_id: 'c-1',
    quantity: 2,
    payment_status: 'pending',
    voter_phone: '+2290197000000',
    total_amount: 200,
    currency: 'XOF',
    candidate_name: 'Awa Bocovo',
    votes_before: 10,
    votes_after: 10,
    ...vote,
  }))
  const state = { votes, voteCount: 10 }
  const run = (strings: TemplateStringsArray, params: unknown[]): unknown[] => {
    const sql = strings.join('?')
    if (sql.includes('FROM votes') && sql.includes('FOR UPDATE')) {
      const code = params[0] as string
      const found = state.votes.find((vote) => vote.receipt_code === code)
      return found ? [{ ...found }] : []
    }
    if (sql.includes('FROM votes') && sql.includes('JOIN candidates')) {
      return state.votes.filter((vote) => vote.payment_status === 'pending').map((v) => ({ ...v }))
    }
    if (sql.includes('FROM candidates') && sql.includes('FOR UPDATE'))
      return [{ vote_count: state.voteCount }]
    if (sql.includes('UPDATE candidates')) {
      state.voteCount = params[0] as number
      return []
    }
    if (sql.includes('UPDATE votes')) {
      const terminal = params.find((p) => p === 'confirmed' || p === 'rejected')
      const code = params[params.length - 1] as string
      const target = state.votes.find((vote) => vote.receipt_code === code)
      if (terminal && target) target.payment_status = terminal as string
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
const makeNotifier = () => ({ voteConfirmedLate: vi.fn().mockResolvedValue(undefined) })
describe('reconcilePendingVotes', () => {
  it('confirme les votes payés, rejette les refusés, garde les pending', async () => {
    const db = makeDb([
      { receipt_code: 'AWAC-1700000000001-APPROVED' },
      { receipt_code: 'AWAC-1700000000002-REJECTED' },
      { receipt_code: 'AWAC-1700000000003-WAITING0' },
    ])
    const getCollection = vi.fn().mockImplementation(async (code: string) => {
      if (code.endsWith('APPROVED')) return { transaction_id: 'sp_1', status: 'approved' }
      if (code.endsWith('REJECTED')) return { transaction_id: 'sp_2', status: 'rejected' }
      return { transaction_id: 'sp_3', status: 'pending' }
    })
    const notifier = makeNotifier()
    const summary = await reconcilePendingVotes(
      {
        db: asDb(db) as unknown as Db,
        sebpay: asSebpay({ getCollection }),
        notifier: notifier as LateConfirmationNotifier,
      },
      {},
    )
    expect(summary).toMatchObject({ checked: 3, confirmed: 1, rejected: 1, stillPending: 1 })
    expect(db._state.voteCount).toBe(12)
  })
  it('notifie le votant uniquement pour une confirmation tardive', async () => {
    const db = makeDb([
      { receipt_code: 'AWAC-1700000000001-APPROVED' },
      { receipt_code: 'AWAC-1700000000002-REJECTED' },
    ])
    const getCollection = vi.fn().mockImplementation(async (code: string) => ({
      transaction_id: 'sp',
      status: code.endsWith('APPROVED') ? 'approved' : 'rejected',
    }))
    const notifier = makeNotifier()
    await reconcilePendingVotes(
      {
        db: asDb(db) as unknown as Db,
        sebpay: asSebpay({ getCollection }),
        notifier: notifier as LateConfirmationNotifier,
      },
      {},
    )
    expect(notifier.voteConfirmedLate).toHaveBeenCalledTimes(1)
    const [info] = notifier.voteConfirmedLate.mock.calls[0]!
    expect(info.receiptCode).toBe('AWAC-1700000000001-APPROVED')
    expect(info.voterPhone).toBe('+2290197000000')
    expect(info.candidateName).toBe('Awa Bocovo')
    expect(info.quantity).toBe(2)
  })
  it("une erreur SebPay sur un vote n'empêche pas les suivants (et il reste pending)", async () => {
    const db = makeDb([
      { receipt_code: 'AWAC-1700000000001-BROKEN00' },
      { receipt_code: 'AWAC-1700000000002-APPROVED' },
    ])
    const getCollection = vi.fn().mockImplementation(async (code: string) => {
      if (code.endsWith('BROKEN00')) throw new Error('timeout')
      return { transaction_id: 'sp', status: 'approved' }
    })
    const summary = await reconcilePendingVotes(
      { db: asDb(db) as unknown as Db, sebpay: asSebpay({ getCollection }), notifier: null },
      {},
    )
    expect(summary).toMatchObject({ checked: 2, confirmed: 1, errors: 1 })
  })
  it('sans client SebPay, ne touche à rien', async () => {
    const db = makeDb([{ receipt_code: 'AWAC-1700000000001-WAITING0' }])
    const summary = await reconcilePendingVotes(
      { db: asDb(db) as unknown as Db, sebpay: null, notifier: null },
      {},
    )
    expect(summary).toMatchObject({ checked: 0 })
  })
})
