import { describe, it, expect } from 'vitest'
import { confirmVote, rejectVote } from '../../server/services/voteConfirmation'
import type { Db } from '../../server/types'

const REF = 'AWAC-1'

interface VoteState {
  receipt_code: string
  candidate_id: string
  quantity: number
  payment_status: string
  votes_before: number
  votes_after: number
}

interface DbState {
  vote: VoteState
  candidateVoteCount: number
  updates: { table: string; voteCount?: unknown; params?: unknown[] }[]
}

interface MockDb {
  (strings: TemplateStringsArray, ...params: unknown[]): Promise<unknown[]>
  begin: (
    fn: (
      tx: (strings: TemplateStringsArray, ...params: unknown[]) => Promise<unknown[]>,
    ) => unknown,
  ) => Promise<unknown>
  _state: DbState
}

// Fake transactionnel : garde l'état d'un vote + du compteur candidat en mémoire.
function makeDb(initial: { vote?: Partial<VoteState>; candidateVoteCount?: number }): MockDb {
  const state: DbState = {
    vote: {
      receipt_code: REF,
      candidate_id: 'c1',
      quantity: 3,
      payment_status: 'pending',
      votes_before: 10,
      votes_after: 10,
      ...initial.vote,
    },
    candidateVoteCount: initial.candidateVoteCount ?? 10,
    updates: [],
  }
  const db = (() => Promise.resolve([])) as unknown as MockDb
  db.begin = async (fn) => {
    const tx = (strings: TemplateStringsArray, ...params: unknown[]) => {
      const sql = strings.join('?')
      if (sql.includes('FROM votes') && sql.includes('FOR UPDATE')) {
        return Promise.resolve([{ ...state.vote }])
      }
      if (sql.includes('SELECT vote_count FROM candidates') && sql.includes('FOR UPDATE')) {
        return Promise.resolve([{ vote_count: state.candidateVoteCount }])
      }
      if (sql.includes('UPDATE candidates')) {
        state.candidateVoteCount = params[0] as number
        state.updates.push({ table: 'candidates', voteCount: params[0] })
        return Promise.resolve([])
      }
      if (sql.includes('UPDATE votes')) {
        const terminal = params.find((p) => p === 'confirmed' || p === 'rejected')
        state.vote.payment_status = (terminal as string) ?? state.vote.payment_status
        state.updates.push({ table: 'votes', params })
        return Promise.resolve([{ ...state.vote }])
      }
      return Promise.resolve([])
    }
    return fn(tx)
  }
  db._state = state
  return db
}

const asDb = (db: MockDb): Db => db as unknown as Db

describe('confirmVote', () => {
  it('incrémente le compteur candidat et passe le vote à confirmed', async () => {
    const db = makeDb({ candidateVoteCount: 10 })
    const result = await confirmVote(asDb(db), REF, 'sp_tx_1')
    expect(result.status).toBe('confirmed')
    expect(db._state.candidateVoteCount).toBe(13)
    expect(db._state.vote.payment_status).toBe('confirmed')
  })

  it('est idempotent : un second appel ne réincrémente pas', async () => {
    const db = makeDb({
      vote: { payment_status: 'confirmed', votes_after: 13 },
      candidateVoteCount: 13,
    })
    const result = await confirmVote(asDb(db), REF, 'sp_tx_1')
    expect(result.status).toBe('confirmed')
    expect(result.alreadyProcessed).toBe(true)
    expect(db._state.candidateVoteCount).toBe(13)
    const candidateUpdates = db._state.updates.filter((u) => u.table === 'candidates')
    expect(candidateUpdates).toHaveLength(0)
  })

  it('renvoie not_found si la référence est inconnue', async () => {
    const db = makeDb({})
    db.begin = async (fn) => fn(() => Promise.resolve([]))
    const result = await confirmVote(asDb(db), 'inconnu', 'sp_tx_1')
    expect(result.status).toBe('not_found')
  })
})

describe('rejectVote', () => {
  it('passe le vote à rejected sans toucher au compteur', async () => {
    const db = makeDb({ candidateVoteCount: 10 })
    const result = await rejectVote(asDb(db), REF)
    expect(result.status).toBe('rejected')
    expect(db._state.candidateVoteCount).toBe(10)
  })

  it('ne rejette pas un vote déjà confirmé', async () => {
    const db = makeDb({ vote: { payment_status: 'confirmed' }, candidateVoteCount: 13 })
    const result = await rejectVote(asDb(db), REF)
    expect(result.status).toBe('confirmed')
    expect(result.alreadyProcessed).toBe(true)
  })
})
