import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { submitVote, getVoteStatus, processWebhook } from '../../server/services/votes'
import { asDb } from './helpers'
import type { Db, FeexpayClient } from '../../server/types'
const CANDIDATE_ID = '6a3c0e1f-2b4d-4f5a-9c8e-1d2f3a4b5c6d'
const VOTE_ID = '11111111-2222-3333-4444-555555555555'
const WEBHOOK_SECRET = 'tok_webhook_xyz'
const FEEXPAY_REFERENCE = 'fx_ref_1'
const asFeexpay = (o: unknown): FeexpayClient => o as unknown as FeexpayClient

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-08-14T23:59:58+01:00'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})
interface VoteRow {
  id: string
  receipt_code: string | null
  candidate_id: string
  quantity: number
  payment_status: string
  payment_reference: string | null
  total_amount: number
  votes_before: number
  votes_after: number
}
interface DbState {
  voteCount: number
  vote: VoteRow
  calls: string[]
}
function makeDb({
  candidateExists = true,
  voteCount = 10,
  voteStatus = 'pending',
  pendingCount = 0,
  paymentReference = FEEXPAY_REFERENCE as string | null,
} = {}) {
  const state: DbState & { pendingCount: number } = {
    pendingCount,
    voteCount,
    vote: {
      id: VOTE_ID,
      receipt_code: null,
      candidate_id: CANDIDATE_ID,
      quantity: 3,
      payment_status: voteStatus,
      payment_reference: paymentReference,
      total_amount: 300,
      votes_before: voteCount,
      votes_after: voteCount,
    },
    calls: [],
  }
  const run = (strings: TemplateStringsArray, params: unknown[]): unknown[] => {
    const sql = strings.join('?')
    state.calls.push(sql)
    if (sql.includes('AS pending')) return [{ pending: state.pendingCount }]
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
          ...state.vote,
          receipt_code: state.vote.receipt_code ?? 'AWAC-known',
        },
      ]
    }
    if (sql.includes('UPDATE candidates')) {
      state.voteCount = params[0] as number
      state.vote.votes_after = params[0] as number
      return []
    }
    if (sql.includes('SET payment_reference') && !sql.includes('payment_status')) {
      state.vote.payment_reference = params[0] as string
      return [{ ...state.vote }]
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
describe('submitVote — mode simulé', () => {
  it('crée un vote et le confirme immédiatement (201)', async () => {
    const db = makeDb()
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, feexpay: null },
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
  it('crée un vote pending et initie le paiement FeexPay (201)', async () => {
    const db = makeDb()
    const initPayment = vi
      .fn()
      .mockResolvedValue({ reference: FEEXPAY_REFERENCE, status: 'PENDING' })
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ initPayment }) },
      validBody,
    )
    expect(res.status).toBe(201)
    expect((res.body as { payment_status: string }).payment_status).toBe('pending')
    expect(db._state.voteCount).toBe(10)
    const [args] = initPayment.mock.calls[0]!
    expect(args.network).toBe('mtn')
    expect(args.phoneNumber).toBe('2290197000000')
    expect(args.amount).toBe(300)
    expect(args.callbackInfo).toMatch(/^AWAC-/)
  })
  it('stocke la référence FeexPay comme payment_reference', async () => {
    const db = makeDb()
    const initPayment = vi
      .fn()
      .mockResolvedValue({ reference: FEEXPAY_REFERENCE, status: 'PENDING' })
    await submitVote(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ initPayment }) },
      validBody,
    )
    expect(db._state.vote.payment_reference).toBe(FEEXPAY_REFERENCE)
  })
  it('renvoie 502 si FeexPay refuse', async () => {
    const db = makeDb()
    const initPayment = vi.fn().mockRejectedValue(new Error('Numéro invalide'))
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ initPayment }) },
      validBody,
    )
    expect(res.status).toBe(502)
  })
  it('ne révèle jamais le message interne FeexPay au client', async () => {
    const db = makeDb()
    const initPayment = vi.fn().mockRejectedValue(new Error('secret fournisseur interne'))
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ initPayment }) },
      validBody,
    )

    expect(res).toEqual({
      status: 502,
      body: { error: { code: 'payment_error', message: 'Le paiement a échoué' } },
    })
    expect(JSON.stringify(res.body)).not.toContain('secret fournisseur interne')
  })
  it('force la devise des réglages même si le client en envoie une autre', async () => {
    const db = makeDb()
    const initPayment = vi
      .fn()
      .mockResolvedValue({ reference: FEEXPAY_REFERENCE, status: 'PENDING' })
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ initPayment }) },
      { ...validBody, currency: 'USD' },
    )
    expect(res.status).toBe(201)
    expect((res.body as { currency: string }).currency).toBe('XOF')
  })
  it("persiste le vote avant l'appel FeexPay (aucun paiement orphelin)", async () => {
    const db = makeDb()
    let insertedBeforeCall = false
    const initPayment = vi.fn().mockImplementation(async () => {
      insertedBeforeCall = db._state.calls.some((call) => call.includes('INSERT INTO votes'))
      return { reference: FEEXPAY_REFERENCE, status: 'PENDING' }
    })
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ initPayment }) },
      validBody,
    )
    expect(res.status).toBe(201)
    expect(insertedBeforeCall).toBe(true)
  })
  it('rejette le vote persisté si FeexPay échoue (502)', async () => {
    const db = makeDb()
    const initPayment = vi.fn().mockRejectedValue(new Error('Numéro invalide'))
    const res = await submitVote(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ initPayment }) },
      validBody,
    )
    expect(res.status).toBe(502)
    expect(db._state.calls.some((call) => call.includes('INSERT INTO votes'))).toBe(true)
    expect(db._state.vote.payment_status).toBe('rejected')
    expect(db._state.voteCount).toBe(10)
  })
  it('rejette les entrées invalides avant tout appel FeexPay (400)', async () => {
    const initPayment = vi.fn()
    for (const body of [
      { ...validBody, quantity: 0 },
      { ...validBody, candidate_id: 'pas-uuid' },
      { ...validBody, operator: '' },
      { ...validBody, voter_phone: '' },
    ]) {
      const res = await submitVote(
        { db: asDb(makeDb()) as unknown as Db, feexpay: asFeexpay({ initPayment }) },
        body,
      )
      expect(res.status).toBe(400)
    }
    expect(initPayment).not.toHaveBeenCalled()
  })
  it('refuse un opérateur hors catalogue en mode réel (400)', async () => {
    const initPayment = vi.fn()
    const res = await submitVote(
      { db: asDb(makeDb()) as unknown as Db, feexpay: asFeexpay({ initPayment }) },
      { ...validBody, operator: 'orange' },
    )
    expect(res.status).toBe(400)
    expect(initPayment).not.toHaveBeenCalled()
  })
})
describe('submitVote — garde-fous sécurité', () => {
  it('refuse toute nouvelle initiation exactement à la clôture, avant base et FeexPay (410)', async () => {
    const db = makeDb()
    const initPayment = vi.fn()
    const res = await submitVote(
      {
        db: asDb(db) as unknown as Db,
        feexpay: asFeexpay({ initPayment }),
        now: () => new Date('2026-08-14T23:59:59+01:00'),
      },
      validBody,
    )

    expect(res).toEqual({
      status: 410,
      body: { error: { code: 'voting_closed', message: 'Les votes sont clos' } },
    })
    expect(db._state.calls).toEqual([])
    expect(initPayment).not.toHaveBeenCalled()
  })

  it('accepte encore une initiation une milliseconde avant la clôture', async () => {
    const initPayment = vi
      .fn()
      .mockResolvedValue({ reference: FEEXPAY_REFERENCE, status: 'PENDING' })
    const res = await submitVote(
      {
        db: asDb(makeDb()) as unknown as Db,
        feexpay: asFeexpay({ initPayment }),
        now: () => new Date('2026-08-14T23:59:58.999+01:00'),
      },
      validBody,
    )

    expect(res.status).toBe(201)
    expect(initPayment).toHaveBeenCalledOnce()
  })

  it('refuse une quantité au-dessus du plafond serveur 999, avant tout appel FeexPay (400)', async () => {
    const initPayment = vi.fn()
    const res = await submitVote(
      { db: asDb(makeDb()) as unknown as Db, feexpay: asFeexpay({ initPayment }) },
      { ...validBody, quantity: 1000 },
    )
    expect(res.status).toBe(400)
    expect(initPayment).not.toHaveBeenCalled()
  })
  it('accepte la quantité limite 999 (201)', async () => {
    const initPayment = vi
      .fn()
      .mockResolvedValue({ reference: FEEXPAY_REFERENCE, status: 'PENDING' })
    const res = await submitVote(
      { db: asDb(makeDb()) as unknown as Db, feexpay: asFeexpay({ initPayment }) },
      { ...validBody, quantity: 999 },
    )
    expect(res.status).toBe(201)
  })
  it('bloque quand trop de demandes en attente pour le numéro, sans appeler FeexPay (429)', async () => {
    const initPayment = vi.fn()
    const res = await submitVote(
      {
        db: asDb(makeDb({ pendingCount: 5 })) as unknown as Db,
        feexpay: asFeexpay({ initPayment }),
      },
      validBody,
    )
    expect(res.status).toBe(429)
    expect(initPayment).not.toHaveBeenCalled()
  })
  it('refuse le mode simulé en production (503, aucun vote gratuit)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const db = makeDb()
    const res = await submitVote({ db: asDb(db) as unknown as Db, feexpay: null }, validBody)
    expect(res.status).toBe(503)
    expect(db._state.voteCount).toBe(10)
    expect(db._state.calls.some((call) => call.includes('INSERT INTO votes'))).toBe(false)
    vi.unstubAllEnvs()
  })
})
describe('getVoteStatus — polling', () => {
  it('réconcilie après la clôture un paiement initié avant celle-ci', async () => {
    vi.setSystemTime(new Date('2026-08-15T00:00:00+01:00'))
    const db = makeDb({ voteStatus: 'pending' })
    const getPaymentStatus = vi
      .fn()
      .mockResolvedValue({ reference: FEEXPAY_REFERENCE, status: 'SUCCESSFUL', amount: 300 })

    const res = await getVoteStatus(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ getPaymentStatus }) },
      VOTE_ID,
    )

    expect((res.body as { payment_status: string }).payment_status).toBe('confirmed')
    expect(db._state.voteCount).toBe(13)
  })

  it('réconcilie via FeexPay et confirme quand SUCCESSFUL', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getPaymentStatus = vi
      .fn()
      .mockResolvedValue({ reference: FEEXPAY_REFERENCE, status: 'SUCCESSFUL', amount: 300 })
    const res = await getVoteStatus(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ getPaymentStatus }) },
      VOTE_ID,
    )
    expect(res.status).toBe(200)
    expect((res.body as { payment_status: string }).payment_status).toBe('confirmed')
    expect(getPaymentStatus).toHaveBeenCalledWith(FEEXPAY_REFERENCE)
  })
  it('rejette quand FAILED', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getPaymentStatus = vi
      .fn()
      .mockResolvedValue({ reference: FEEXPAY_REFERENCE, status: 'FAILED' })
    const res = await getVoteStatus(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ getPaymentStatus }) },
      VOTE_ID,
    )
    expect((res.body as { payment_status: string }).payment_status).toBe('rejected')
  })
  it('ne confirme pas si le montant payé ne correspond pas au montant attendu', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getPaymentStatus = vi
      .fn()
      .mockResolvedValue({ reference: FEEXPAY_REFERENCE, status: 'SUCCESSFUL', amount: 100 })
    const res = await getVoteStatus(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ getPaymentStatus }) },
      VOTE_ID,
    )
    expect((res.body as { payment_status: string }).payment_status).toBe('pending')
    expect(db._state.voteCount).toBe(10)
  })
  it('reste pending sans référence FeexPay stockée, sans appel API', async () => {
    const db = makeDb({ voteStatus: 'pending', paymentReference: null })
    const getPaymentStatus = vi.fn()
    const res = await getVoteStatus(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ getPaymentStatus }) },
      VOTE_ID,
    )
    expect((res.body as { payment_status: string }).payment_status).toBe('pending')
    expect(getPaymentStatus).not.toHaveBeenCalled()
  })
  it('ne rappelle pas FeexPay si déjà confirmé', async () => {
    const db = makeDb({ voteStatus: 'confirmed' })
    const getPaymentStatus = vi.fn()
    const res = await getVoteStatus(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ getPaymentStatus }) },
      VOTE_ID,
    )
    expect((res.body as { payment_status: string }).payment_status).toBe('confirmed')
    expect(getPaymentStatus).not.toHaveBeenCalled()
  })
  it('reste pending si FeexPay injoignable', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getPaymentStatus = vi.fn().mockRejectedValue(new Error('timeout'))
    const res = await getVoteStatus(
      { db: asDb(db) as unknown as Db, feexpay: asFeexpay({ getPaymentStatus }) },
      VOTE_ID,
    )
    expect((res.body as { payment_status: string }).payment_status).toBe('pending')
  })
  it('renvoie 404 si id non-uuid', async () => {
    const db = makeDb()
    const res = await getVoteStatus({ db: asDb(db) as unknown as Db, feexpay: null }, 'inconnu')
    expect(res.status).toBe(404)
  })
})
describe('processWebhook — jeton + re-vérification serveur', () => {
  const rawFor = (status: string) =>
    JSON.stringify({ reference: FEEXPAY_REFERENCE, status, amount: 300 })
  it('confirme le vote après re-vérification SUCCESSFUL auprès de FeexPay (200)', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getPaymentStatus = vi
      .fn()
      .mockResolvedValue({ reference: FEEXPAY_REFERENCE, status: 'SUCCESSFUL', amount: 300 })
    const res = await processWebhook(
      {
        db: asDb(db) as unknown as Db,
        feexpay: asFeexpay({ getPaymentStatus }),
        secret: WEBHOOK_SECRET,
      },
      rawFor('SUCCESSFUL'),
      WEBHOOK_SECRET,
    )
    expect(res.status).toBe(200)
    expect(getPaymentStatus).toHaveBeenCalledWith(FEEXPAY_REFERENCE)
    expect(db._state.voteCount).toBe(13)
  })
  it('ne croit pas le statut du payload : API dit FAILED → vote rejeté', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getPaymentStatus = vi
      .fn()
      .mockResolvedValue({ reference: FEEXPAY_REFERENCE, status: 'FAILED' })
    const res = await processWebhook(
      {
        db: asDb(db) as unknown as Db,
        feexpay: asFeexpay({ getPaymentStatus }),
        secret: WEBHOOK_SECRET,
      },
      rawFor('SUCCESSFUL'),
      WEBHOOK_SECRET,
    )
    expect(res.status).toBe(200)
    expect(db._state.vote.payment_status).toBe('rejected')
    expect(db._state.voteCount).toBe(10)
  })
  it('ne confirme pas si le montant payé diffère du montant attendu', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getPaymentStatus = vi
      .fn()
      .mockResolvedValue({ reference: FEEXPAY_REFERENCE, status: 'SUCCESSFUL', amount: 100 })
    const res = await processWebhook(
      {
        db: asDb(db) as unknown as Db,
        feexpay: asFeexpay({ getPaymentStatus }),
        secret: WEBHOOK_SECRET,
      },
      rawFor('SUCCESSFUL'),
      WEBHOOK_SECRET,
    )
    expect(res.status).toBe(200)
    expect(db._state.vote.payment_status).toBe('pending')
    expect(db._state.voteCount).toBe(10)
  })
  it('rejette un jeton invalide ou absent (401), sans muter ni appeler FeexPay', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getPaymentStatus = vi.fn()
    for (const token of ['faux', null, '']) {
      const res = await processWebhook(
        {
          db: asDb(db) as unknown as Db,
          feexpay: asFeexpay({ getPaymentStatus }),
          secret: WEBHOOK_SECRET,
        },
        rawFor('SUCCESSFUL'),
        token as string | null,
      )
      expect(res.status).toBe(401)
    }
    expect(getPaymentStatus).not.toHaveBeenCalled()
    expect(db._state.voteCount).toBe(10)
  })
  it('rejette tout webhook si aucun secret configuré (401)', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const res = await processWebhook(
      { db: asDb(db) as unknown as Db, feexpay: null, secret: '' },
      rawFor('SUCCESSFUL'),
      '',
    )
    expect(res.status).toBe(401)
  })
  it('répond 200 sans effet pour une référence inconnue', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const emptyDb = ((strings: TemplateStringsArray) => {
      const sql = strings.join('?')
      return Promise.resolve(sql.includes('FROM votes') ? [] : [])
    }) as unknown as Db
    const getPaymentStatus = vi.fn()
    const res = await processWebhook(
      { db: emptyDb, feexpay: asFeexpay({ getPaymentStatus }), secret: WEBHOOK_SECRET },
      rawFor('SUCCESSFUL'),
      WEBHOOK_SECRET,
    )
    expect(res.status).toBe(200)
    expect(getPaymentStatus).not.toHaveBeenCalled()
    expect(db._state.voteCount).toBe(10)
  })
})
