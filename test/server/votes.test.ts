import { describe, it, expect, vi } from 'vitest'
import crypto from 'node:crypto'
import { submitVote, getVoteStatus, processWebhook } from '../../server/services/votes'
import { asDb } from './helpers'
import type { Db, SebpayClient } from '../../server/types'

const CANDIDATE_ID = '6a3c0e1f-2b4d-4f5a-9c8e-1d2f3a4b5c6d'
const VOTE_ID = '11111111-2222-3333-4444-555555555555'
const SECRET = 'sk_test_xyz'

const asSebpay = (o: unknown): SebpayClient => o as unknown as SebpayClient

interface VoteRow {
  id: string
  receipt_code: string | null
  candidate_id: string
  quantity: number
  payment_status: string
  votes_before: number
  votes_after: number
}
interface DbState {
  voteCount: number
  vote: VoteRow
  calls: string[]
}

function makeDb({ candidateExists = true, voteCount = 10, voteStatus = 'pending' } = {}) {
  const state: DbState = {
    voteCount,
    vote: {
      id: VOTE_ID,
      receipt_code: null,
      candidate_id: CANDIDATE_ID,
      quantity: 3,
      payment_status: voteStatus,
      votes_before: voteCount,
      votes_after: voteCount,
    },
    calls: [],
  }
  const run = (strings: TemplateStringsArray, params: unknown[]): unknown[] => {
    const sql = strings.join('?')
    state.calls.push(sql)
    if (sql.includes('FROM candidates') && sql.includes('FOR UPDATE'))
      return [{ vote_count: state.voteCount }]
    if (sql.includes('FROM candidates'))
      return candidateExists ? [{ id: CANDIDATE_ID, vote_count: state.voteCount }] : []
    if (sql.includes('FROM settings')) return [{ vote_unit_price: 100, currency: 'XOF' }]
    if (sql.includes('INSERT INTO votes')) {
      state.vote.receipt_code =
        (params.find((p) => typeof p === 'string' && p.startsWith('AWAC-')) as string) ?? null
      return [{ id: VOTE_ID, receipt_code: state.vote.receipt_code }]
    }
    if (sql.includes('FROM votes') && sql.includes('FOR UPDATE')) return [{ ...state.vote }]
    if (sql.includes('SELECT') && sql.includes('FROM votes')) {
      return [
        {
          id: VOTE_ID,
          receipt_code: state.vote.receipt_code ?? 'AWAC-known',
          payment_status: state.vote.payment_status,
          votes_after: state.vote.votes_after,
        },
      ]
    }
    if (sql.includes('UPDATE candidates')) {
      state.voteCount = params[0] as number
      state.vote.votes_after = params[0] as number
      return []
    }
    if (sql.includes('UPDATE votes')) {
      const terminal = params.find((p) => p === 'confirmed' || p === 'rejected')
      if (terminal) state.vote.payment_status = terminal as string
      return [{ ...state.vote }]
    }
    return []
  }
  const db = ((strings: TemplateStringsArray, ...params: unknown[]) =>
    Promise.resolve(run(strings, params))) as {
    (strings: TemplateStringsArray, ...params: unknown[]): Promise<unknown[]>
    begin: (
      fn: (tx: (s: TemplateStringsArray, ...p: unknown[]) => Promise<unknown[]>) => unknown,
    ) => Promise<unknown>
    _state: DbState
  }
  db.begin = async (fn) =>
    fn((strings: TemplateStringsArray, ...params: unknown[]) =>
      Promise.resolve(run(strings, params)),
    )
  db._state = state
  return db
}

const validBody = {
  candidate_id: CANDIDATE_ID,
  quantity: 3,
  operator: 'mtn',
  voter_phone: '+22997000000',
  country: 'BJ',
}
const config = { callbackUrl: 'https://awac.test/votes/webhook' }

describe('submitVote — mode simulé', () => {
  it('crée un vote et le confirme immédiatement (201)', async () => {
    const db = makeDb()
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, sebpay: null, config },
      { ...validBody, operator: 'demo' },
    )
    expect(res.status).toBe(201)
    expect((res.body as { payment_status: string }).payment_status).toBe('confirmed')
    expect((res.body as { receipt_code: string }).receipt_code).toMatch(/^AWAC-/)
    expect((res.body as { votes_after: number }).votes_after).toBe(13)
    expect(db._state.voteCount).toBe(13)
  })
})

describe('submitVote — mode réel', () => {
  it('crée un vote pending, appelle SebPay, renvoie provider_link (201)', async () => {
    const db = makeDb()
    const createCollection = vi
      .fn()
      .mockResolvedValue({
        transaction_id: 'sp_1',
        status: 'pending',
        provider_link: 'https://pay/x',
      })
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, sebpay: asSebpay({ createCollection }), config },
      validBody,
    )
    expect(res.status).toBe(201)
    expect((res.body as { provider_link: string }).provider_link).toBe('https://pay/x')
    expect(db._state.voteCount).toBe(10)
    const [args] = createCollection.mock.calls[0]!
    expect(args.phone).toBe('22997000000')
    expect(args.amount).toBe(300)
  })

  it('renvoie 502 si SebPay refuse', async () => {
    const db = makeDb()
    const createCollection = vi.fn().mockRejectedValue(new Error('Numéro invalide'))
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, sebpay: asSebpay({ createCollection }), config },
      validBody,
    )
    expect(res.status).toBe(502)
  })

  it('force la devise des réglages même si le client en envoie une autre', async () => {
    const db = makeDb()
    const createCollection = vi
      .fn()
      .mockResolvedValue({ transaction_id: 'sp_1', status: 'pending', provider_link: null })
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, sebpay: asSebpay({ createCollection }), config },
      { ...validBody, currency: 'USD' },
    )
    expect(res.status).toBe(201)
    expect((res.body as { currency: string }).currency).toBe('XOF')
    const [args] = createCollection.mock.calls[0]!
    expect(args.currency).toBe('XOF')
  })

  it("persiste le vote avant l'appel SebPay (aucun paiement orphelin)", async () => {
    const db = makeDb()
    let insertedBeforeCall = false
    const createCollection = vi.fn().mockImplementation(async () => {
      insertedBeforeCall = db._state.calls.some((call) => call.includes('INSERT INTO votes'))
      return { transaction_id: 'sp_1', status: 'pending', provider_link: null }
    })
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, sebpay: asSebpay({ createCollection }), config },
      validBody,
    )
    expect(res.status).toBe(201)
    expect(insertedBeforeCall).toBe(true)
  })

  it('rejette le vote persisté si SebPay échoue (502)', async () => {
    const db = makeDb()
    const createCollection = vi.fn().mockRejectedValue(new Error('Numéro invalide'))
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, sebpay: asSebpay({ createCollection }), config },
      validBody,
    )
    expect(res.status).toBe(502)
    expect(db._state.calls.some((call) => call.includes('INSERT INTO votes'))).toBe(true)
    expect(db._state.vote.payment_status).toBe('rejected')
    expect(db._state.voteCount).toBe(10)
  })

  it('rejette les entrées invalides avant tout appel SebPay (400)', async () => {
    const createCollection = vi.fn()
    for (const body of [
      { ...validBody, quantity: 0 },
      { ...validBody, candidate_id: 'pas-uuid' },
      { ...validBody, operator: '' },
      { ...validBody, voter_phone: '' },
    ]) {
      const res = await submitVote(
        { db: asDb(makeDb()) as unknown as Db, sebpay: asSebpay({ createCollection }), config },
        body,
      )
      expect(res.status).toBe(400)
    }
    expect(createCollection).not.toHaveBeenCalled()
  })
})

describe('getVoteStatus — polling', () => {
  it('réconcilie via SebPay et confirme quand approved', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getCollection = vi.fn().mockResolvedValue({ transaction_id: 'sp_1', status: 'approved' })
    const res = await getVoteStatus(
      { db: asDb(db) as unknown as Db, sebpay: asSebpay({ getCollection }) },
      VOTE_ID,
    )
    expect(res.status).toBe(200)
    expect((res.body as { payment_status: string }).payment_status).toBe('confirmed')
    expect(getCollection).toHaveBeenCalledWith('AWAC-known')
  })

  it('ne rappelle pas SebPay si déjà confirmé', async () => {
    const db = makeDb({ voteStatus: 'confirmed' })
    const getCollection = vi.fn()
    const res = await getVoteStatus(
      { db: asDb(db) as unknown as Db, sebpay: asSebpay({ getCollection }) },
      VOTE_ID,
    )
    expect((res.body as { payment_status: string }).payment_status).toBe('confirmed')
    expect(getCollection).not.toHaveBeenCalled()
  })

  it('reste pending si SebPay injoignable', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getCollection = vi.fn().mockRejectedValue(new Error('timeout'))
    const res = await getVoteStatus(
      { db: asDb(db) as unknown as Db, sebpay: asSebpay({ getCollection }) },
      VOTE_ID,
    )
    expect((res.body as { payment_status: string }).payment_status).toBe('pending')
  })

  it('renvoie 404 si id non-uuid', async () => {
    const db = makeDb()
    const res = await getVoteStatus({ db: asDb(db) as unknown as Db, sebpay: null }, 'inconnu')
    expect(res.status).toBe(404)
  })
})

describe('processWebhook — signature', () => {
  const sign = (raw: string) => crypto.createHmac('sha256', SECRET).update(raw).digest('hex')

  it('confirme le vote sur webhook approved signé (200)', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const raw = JSON.stringify({
      external_reference: 'AWAC-known',
      transaction_id: 'sp_1',
      status: 'approved',
    })
    const res = await processWebhook(
      { db: asDb(db) as unknown as Db, secret: SECRET },
      raw,
      sign(raw),
    )
    expect(res.status).toBe(200)
    expect(db._state.voteCount).toBe(13)
  })

  it('rejette une signature invalide (401), sans muter', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const raw = JSON.stringify({ external_reference: 'AWAC-known', status: 'approved' })
    const res = await processWebhook({ db: asDb(db) as unknown as Db, secret: SECRET }, raw, 'faux')
    expect(res.status).toBe(401)
    expect(db._state.voteCount).toBe(10)
  })
})
