import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handlerOf } from './routeHelpers'

const listAdminVotesMock = vi.fn()
const getAdminStatsMock = vi.fn()
const updateCandidateMock = vi.fn()
const deleteCandidateMock = vi.fn()
const requireAdminSessionMock = vi.fn()

vi.mock('../../server/services/admin/votes', () => ({ listAdminVotes: listAdminVotesMock }))
vi.mock('../../server/services/admin/stats', () => ({ getAdminStats: getAdminStatsMock }))
vi.mock('../../server/services/admin/candidates', () => ({
  listAdminCandidates: vi.fn(),
  createCandidate: vi.fn(),
  updateCandidate: updateCandidateMock,
  deleteCandidate: deleteCandidateMock,
  addCandidatePhoto: vi.fn(),
  removeCandidatePhoto: vi.fn(),
}))
vi.mock('../../server/lib/adminSession', () => ({ requireAdminSession: requireAdminSessionMock }))
vi.mock('../../server/lib/db', () => ({ getDb: () => ({}) }))

beforeEach(() => {
  listAdminVotesMock.mockReset()
  getAdminStatsMock.mockReset()
  updateCandidateMock.mockReset()
  deleteCandidateMock.mockReset()
  requireAdminSessionMock.mockReset().mockResolvedValue({ adminId: 'admin-1' })
})

describe('GET /api/admin/votes', () => {
  it('transmet tous les filtres de query au service', async () => {
    listAdminVotesMock.mockResolvedValue({ status: 200, body: { items: [] } })
    const { Route } = await import('../../src/routes/api/admin/votes')
    await handlerOf(Route, 'GET')({
      request: new Request(
        'https://awac.test/api/admin/votes?status=paid&candidate=c-1&search=abc&page=2&limit=50',
      ),
      params: {},
    })
    expect(listAdminVotesMock.mock.calls[0]?.[1]).toEqual({
      status: 'paid',
      candidateId: 'c-1',
      search: 'abc',
      page: 2,
      limit: 50,
    })
  })

  it('laisse les filtres absents à undefined', async () => {
    listAdminVotesMock.mockResolvedValue({ status: 200, body: { items: [] } })
    const { Route } = await import('../../src/routes/api/admin/votes')
    await handlerOf(Route, 'GET')({
      request: new Request('https://awac.test/api/admin/votes'),
      params: {},
    })
    expect(listAdminVotesMock.mock.calls[0]?.[1]).toEqual({
      status: undefined,
      candidateId: undefined,
      search: undefined,
      page: undefined,
      limit: undefined,
    })
  })

  it('refuse sans session admin', async () => {
    requireAdminSessionMock.mockRejectedValue(
      Object.assign(new Error('Authentification requise'), { status: 401, code: 'unauthorized' }),
    )
    const { Route } = await import('../../src/routes/api/admin/votes')
    const res = await handlerOf(Route, 'GET')({
      request: new Request('https://awac.test/api/admin/votes'),
      params: {},
    })
    expect(res.status).toBe(401)
    expect(listAdminVotesMock).not.toHaveBeenCalled()
  })
})

describe('/api/admin/candidates/$id', () => {
  it('PATCH transmet id et corps au service', async () => {
    updateCandidateMock.mockResolvedValue({ status: 200, body: { id: 'c-1' } })
    const { Route } = await import('../../src/routes/api/admin/candidates.$id')
    await handlerOf(Route, 'PATCH')({
      request: new Request('https://awac.test/api/admin/candidates/c-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ full_name: 'Nouveau nom' }),
      }),
      params: { id: 'c-1' },
    })
    expect(updateCandidateMock.mock.calls[0]?.[1]).toBe('c-1')
    expect(updateCandidateMock.mock.calls[0]?.[2]).toEqual({ full_name: 'Nouveau nom' })
  })

  it('DELETE transmet id au service', async () => {
    deleteCandidateMock.mockResolvedValue({ status: 200, body: { ok: true } })
    const { Route } = await import('../../src/routes/api/admin/candidates.$id')
    await handlerOf(Route, 'DELETE')({
      request: new Request('https://awac.test/api/admin/candidates/c-1', { method: 'DELETE' }),
      params: { id: 'c-1' },
    })
    expect(deleteCandidateMock.mock.calls[0]?.[1]).toBe('c-1')
  })

  it('DELETE refuse sans session admin', async () => {
    requireAdminSessionMock.mockRejectedValue(
      Object.assign(new Error('Authentification requise'), { status: 401, code: 'unauthorized' }),
    )
    const { Route } = await import('../../src/routes/api/admin/candidates.$id')
    const res = await handlerOf(Route, 'DELETE')({
      request: new Request('https://awac.test/api/admin/candidates/c-1', { method: 'DELETE' }),
      params: { id: 'c-1' },
    })
    expect(res.status).toBe(401)
    expect(deleteCandidateMock).not.toHaveBeenCalled()
  })
})
