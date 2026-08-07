import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handlerOf } from './routeHelpers'

const submitVoteMock = vi.fn()
const getVoteStatusMock = vi.fn()

vi.mock('../../server/services/votes', () => ({
  submitVote: submitVoteMock,
  getVoteStatus: getVoteStatusMock,
}))
vi.mock('../../server/lib/db', () => ({ getDb: () => ({}) }))
vi.mock('../../server/utils/context', () => ({ getFeexpay: () => null }))

beforeEach(() => {
  submitVoteMock.mockReset()
  getVoteStatusMock.mockReset()
})

describe('POST /api/votes', () => {
  it('transmet le corps JSON au service', async () => {
    submitVoteMock.mockResolvedValue({ status: 201, body: { id: 'v-1' } })
    const { Route } = await import('../../src/routes/api/votes/index')
    const res = await handlerOf(Route, 'POST')({
      request: new Request('https://awac.test/api/votes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ candidateId: 'c-1', quantity: 2 }),
      }),
      params: {},
    })
    expect(submitVoteMock.mock.calls[0]?.[1]).toEqual({ candidateId: 'c-1', quantity: 2 })
    expect(res.status).toBe(201)
  })

  it('transmet un objet vide quand le corps est illisible, sans produire de 500', async () => {
    submitVoteMock.mockResolvedValue({
      status: 400,
      body: { error: { code: 'validation_error', message: 'Candidat requis' } },
    })
    const { Route } = await import('../../src/routes/api/votes/index')
    const res = await handlerOf(Route, 'POST')({
      request: new Request('https://awac.test/api/votes', { method: 'POST', body: 'pas-du-json' }),
      params: {},
    })
    expect(submitVoteMock.mock.calls[0]?.[1]).toEqual({})
    expect(res.status).toBe(400)
  })
})

describe('GET /api/votes/$id/status', () => {
  it('transmet le paramètre de route au service', async () => {
    getVoteStatusMock.mockResolvedValue({ status: 200, body: { status: 'pending' } })
    const { Route } = await import('../../src/routes/api/votes.$id.status')
    await handlerOf(Route, 'GET')({
      request: new Request('https://awac.test/api/votes/v-1/status'),
      params: { id: 'v-1' },
    })
    expect(getVoteStatusMock.mock.calls[0]?.[1]).toBe('v-1')
  })
})
