import { describe, it, expect } from 'vitest'
import { buildTestApp, recordingDb } from './helpers.js'
import votesRouter from '../src/routes/votes.js'

const CANDIDATE_ID = '6a3c0e1f-2b4d-4f5a-9c8e-1d2f3a4b5c6d'

function voteDb({ candidateExists = true } = {}) {
  return recordingDb((sql, params) => {
    if (sql.includes('FROM settings')) return [{ vote_unit_price: 100, currency: 'XOF' }]
    if (sql.includes('FROM candidates') && sql.includes('FOR UPDATE')) {
      return candidateExists ? [{ id: CANDIDATE_ID, vote_count: 10 }] : []
    }
    if (sql.includes('INSERT INTO votes')) {
      return [{
        id: 'v1', quantity: params[1], total_amount: params[3],
        currency: 'XOF', payment_status: 'simulated', receipt_code: params[6],
        votes_after: 10 + params[1],
      }]
    }
    if (sql.includes('UPDATE candidates')) return []
    return []
  })
}

async function postVote(app, body) {
  return app.request('/votes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('votes route', () => {
  it('crée un vote simulé, calcule le total et incrémente le compteur', async () => {
    const db = voteDb()
    const app = buildTestApp({ db }, (a) => a.route('/votes', votesRouter))
    const res = await postVote(app, {
      candidate_id: CANDIDATE_ID,
      quantity: 5,
      payment_provider: 'demo',
      voter_phone: '+22999999999',
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.total_amount).toBe(500)
    expect(body.payment_status).toBe('simulated')
    expect(body.receipt_code).toMatch(/^AWAC-/)
    expect(body.votes_after).toBe(15)
    const updateCall = db.calls.find((call) => call.sql.includes('UPDATE candidates'))
    expect(updateCall).toBeDefined()
  })

  it('rejette une quantité non entière positive', async () => {
    const db = voteDb()
    const app = buildTestApp({ db }, (a) => a.route('/votes', votesRouter))
    for (const quantity of [0, -1, 1.5, 'abc', null]) {
      const res = await postVote(app, {
        candidate_id: CANDIDATE_ID, quantity, payment_provider: 'demo', voter_phone: '+229',
      })
      expect(res.status).toBe(400)
    }
  })

  it('rejette un candidate_id manquant ou non-uuid', async () => {
    const db = voteDb()
    const app = buildTestApp({ db }, (a) => a.route('/votes', votesRouter))
    for (const candidateId of [undefined, '', 'pas-un-uuid']) {
      const res = await postVote(app, {
        candidate_id: candidateId, quantity: 1, payment_provider: 'demo', voter_phone: '+229',
      })
      expect(res.status).toBe(400)
    }
  })

  it('rejette un opérateur inconnu', async () => {
    const db = voteDb()
    const app = buildTestApp({ db }, (a) => a.route('/votes', votesRouter))
    const res = await postVote(app, {
      candidate_id: CANDIDATE_ID, quantity: 1, payment_provider: 'paypal', voter_phone: '+229',
    })
    expect(res.status).toBe(400)
  })

  it('renvoie 404 si le candidat est introuvable', async () => {
    const db = voteDb({ candidateExists: false })
    const app = buildTestApp({ db }, (a) => a.route('/votes', votesRouter))
    const res = await postVote(app, {
      candidate_id: CANDIDATE_ID, quantity: 1, payment_provider: 'demo', voter_phone: '+229',
    })
    expect(res.status).toBe(404)
  })

  it('plafonne la quantité pour éviter les débordements', async () => {
    const db = voteDb()
    const app = buildTestApp({ db }, (a) => a.route('/votes', votesRouter))
    const res = await postVote(app, {
      candidate_id: CANDIDATE_ID, quantity: 1000001, payment_provider: 'demo', voter_phone: '+229',
    })
    expect(res.status).toBe(400)
  })

  it('rejette un JSON malformé', async () => {
    const db = voteDb()
    const app = buildTestApp({ db }, (a) => a.route('/votes', votesRouter))
    const res = await app.request('/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid',
    })
    expect(res.status).toBe(400)
  })
})
