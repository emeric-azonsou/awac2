import { describe, it, expect, vi } from 'vitest'
import crypto from 'node:crypto'
import { buildTestApp, readJson } from './helpers.ts'
import votesRouter from '../src/routes/votes.ts'
import type { Hono } from 'hono'
import type { AppEnv, SebpayClient } from '../src/types'

const CANDIDATE_ID = '6a3c0e1f-2b4d-4f5a-9c8e-1d2f3a4b5c6d'
const VOTE_ID = '11111111-2222-3333-4444-555555555555'
const SECRET = 'sk_test_xyz'

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

const asSebpay = (o: unknown): SebpayClient => o as unknown as SebpayClient

// Fake DB stateful : candidat + un vote inséré, avec transaction begin().
function makeDb({ candidateExists = true, voteCount = 10, voteStatus = 'pending' } = {}) {
  const state: DbState = {
    voteCount,
    vote: {
      id: VOTE_ID, receipt_code: null, candidate_id: CANDIDATE_ID, quantity: 3,
      payment_status: voteStatus, votes_before: voteCount, votes_after: voteCount,
    },
    calls: [],
  }
  const run = (strings: TemplateStringsArray, params: unknown[]): unknown[] => {
    const sql = strings.join('?')
    state.calls.push(sql)
    if (sql.includes('FROM candidates') && sql.includes('FOR UPDATE')) {
      return [{ vote_count: state.voteCount }]
    }
    if (sql.includes('FROM candidates')) {
      return candidateExists ? [{ id: CANDIDATE_ID, vote_count: state.voteCount }] : []
    }
    if (sql.includes('FROM settings')) return [{ vote_unit_price: 100, currency: 'XOF' }]
    if (sql.includes('INSERT INTO votes')) {
      state.vote.receipt_code = (params.find((p) => typeof p === 'string' && p.startsWith('AWAC-')) as string) ?? null
      return [{ id: VOTE_ID, receipt_code: state.vote.receipt_code }]
    }
    if (sql.includes('FROM votes') && sql.includes('FOR UPDATE')) return [{ ...state.vote }]
    if (sql.includes('SELECT') && sql.includes('FROM votes')) {
      return state.vote.receipt_code || voteStatus !== 'pending'
        ? [{ id: VOTE_ID, receipt_code: state.vote.receipt_code ?? 'AWAC-known', payment_status: state.vote.payment_status, votes_after: state.vote.votes_after }]
        : [{ id: VOTE_ID, receipt_code: 'AWAC-known', payment_status: state.vote.payment_status, votes_after: state.vote.votes_after }]
    }
    if (sql.includes('UPDATE candidates')) { state.voteCount = params[0] as number; state.vote.votes_after = params[0] as number; return [] }
    if (sql.includes('UPDATE votes')) {
      const terminal = params.find((p) => p === 'confirmed' || p === 'rejected')
      if (terminal) state.vote.payment_status = terminal as string
      return [{ ...state.vote }]
    }
    return []
  }
  const db = ((strings: TemplateStringsArray, ...params: unknown[]) => Promise.resolve(run(strings, params))) as {
    (strings: TemplateStringsArray, ...params: unknown[]): Promise<unknown[]>
    begin: (fn: (tx: (strings: TemplateStringsArray, ...params: unknown[]) => Promise<unknown[]>) => unknown) => Promise<unknown>
    _state: DbState
  }
  db.begin = async (fn) => fn((strings: TemplateStringsArray, ...params: unknown[]) => Promise.resolve(run(strings, params)))
  db._state = state
  return db
}

function post(app: Hono<AppEnv>, body: unknown, path = '/votes') {
  return app.request(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

const validBody = { candidate_id: CANDIDATE_ID, quantity: 3, operator: 'mtn', voter_phone: '+22997000000', country: 'BJ' }

describe('POST /votes — mode simulé (sans clés SebPay)', () => {
  it('crée un vote et le confirme immédiatement', async () => {
    const db = makeDb()
    const app = buildTestApp({ db, sebpay: null }, (a) => a.route('/votes', votesRouter))
    const res = await post(app, { ...validBody, operator: 'demo' })
    expect(res.status).toBe(201)
    const body = await readJson(res)
    expect(body.payment_status).toBe('confirmed')
    expect(body.receipt_code).toMatch(/^AWAC-/)
    expect(db._state.voteCount).toBe(13)
  })
})

describe('POST /votes — mode réel (SebPay configuré)', () => {
  it('crée un vote pending et appelle SebPay, renvoie provider_link', async () => {
    const db = makeDb()
    const createCollection = vi.fn().mockResolvedValue({ transaction_id: 'sp_1', status: 'pending', provider_link: 'https://pay.sebpay/x' })
    const app = buildTestApp({ db, sebpay: asSebpay({ createCollection }) }, (a) => a.route('/votes', votesRouter))
    const res = await post(app, validBody)
    expect(res.status).toBe(201)
    const body = await readJson(res)
    expect(body.payment_status).toBe('pending')
    expect(body.provider_link).toBe('https://pay.sebpay/x')
    expect(db._state.voteCount).toBe(10) // pas encore incrémenté
    const [args] = createCollection.mock.calls[0]!
    expect(args.phone).toBe('22997000000') // + retiré
    expect(args.amount).toBe(300)
    expect(args.externalReference).toMatch(/^AWAC-/)
  })

  it('renvoie 502 si SebPay refuse (numéro invalide)', async () => {
    const db = makeDb()
    const createCollection = vi.fn().mockRejectedValue(new Error('SebPay collections a échoué : Numéro invalide'))
    const app = buildTestApp({ db, sebpay: asSebpay({ createCollection }) }, (a) => a.route('/votes', votesRouter))
    const res = await post(app, validBody)
    expect(res.status).toBe(502)
  })

  it('rejette les entrées invalides avant tout appel SebPay', async () => {
    const createCollection = vi.fn()
    const app = buildTestApp({ db: makeDb(), sebpay: asSebpay({ createCollection }) }, (a) => a.route('/votes', votesRouter))
    for (const body of [
      { ...validBody, quantity: 0 },
      { ...validBody, candidate_id: 'pas-uuid' },
      { ...validBody, operator: '' },
      { ...validBody, voter_phone: '' },
    ]) {
      const res = await post(app, body)
      expect(res.status).toBe(400)
    }
    expect(createCollection).not.toHaveBeenCalled()
  })
})

describe('GET /votes/:id/status — polling', () => {
  it('réconcilie via SebPay et confirme quand approved', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getCollection = vi.fn().mockResolvedValue({ transaction_id: 'sp_1', status: 'approved' })
    const app = buildTestApp({ db, sebpay: asSebpay({ getCollection }) }, (a) => a.route('/votes', votesRouter))
    const res = await app.request(`/votes/${VOTE_ID}/status`)
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.payment_status).toBe('confirmed')
    expect(getCollection).toHaveBeenCalledWith('AWAC-known')
  })

  it('ne rappelle pas SebPay si le vote est déjà confirmé', async () => {
    const db = makeDb({ voteStatus: 'confirmed' })
    const getCollection = vi.fn()
    const app = buildTestApp({ db, sebpay: asSebpay({ getCollection }) }, (a) => a.route('/votes', votesRouter))
    const res = await app.request(`/votes/${VOTE_ID}/status`)
    expect((await readJson(res)).payment_status).toBe('confirmed')
    expect(getCollection).not.toHaveBeenCalled()
  })

  it('reste pending si SebPay est injoignable (erreur transitoire)', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getCollection = vi.fn().mockRejectedValue(new Error('timeout'))
    const app = buildTestApp({ db, sebpay: asSebpay({ getCollection }) }, (a) => a.route('/votes', votesRouter))
    const res = await app.request(`/votes/${VOTE_ID}/status`)
    expect(res.status).toBe(200)
    expect((await readJson(res)).payment_status).toBe('pending')
  })
})

describe('POST /votes/webhook — signature', () => {
  const sign = (raw: string) => crypto.createHmac('sha256', SECRET).update(raw).digest('hex')

  it('confirme le vote sur un webhook approved signé', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const app = buildTestApp({ db, sebpaySecret: SECRET }, (a) => a.route('/votes', votesRouter))
    const raw = JSON.stringify({ external_reference: 'AWAC-known', transaction_id: 'sp_1', status: 'approved', amount: 300 })
    const res = await app.request('/votes/webhook', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SebPay-Signature': sign(raw) }, body: raw,
    })
    expect(res.status).toBe(200)
    expect(db._state.voteCount).toBe(13)
  })

  it('rejette un webhook à signature invalide (401), sans muter', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const app = buildTestApp({ db, sebpaySecret: SECRET }, (a) => a.route('/votes', votesRouter))
    const raw = JSON.stringify({ external_reference: 'AWAC-known', status: 'approved' })
    const res = await app.request('/votes/webhook', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SebPay-Signature': 'faux' }, body: raw,
    })
    expect(res.status).toBe(401)
    expect(db._state.voteCount).toBe(10)
  })
})
