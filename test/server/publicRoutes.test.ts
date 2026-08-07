import { describe, it, expect, vi, beforeEach } from 'vitest'

const getCandidateWithPhotosMock = vi.fn()
const getReceiptMock = vi.fn()
const getOperatorsListMock = vi.fn()

vi.mock('../../server/services/candidates', () => ({
  listCandidates: vi.fn(),
  getCandidateWithPhotos: getCandidateWithPhotosMock,
}))
vi.mock('../../server/services/receipts', () => ({ getReceipt: getReceiptMock }))
vi.mock('../../server/services/payment', () => ({
  getCountriesList: vi.fn(),
  getOperatorsList: getOperatorsListMock,
}))
vi.mock('../../server/lib/db', () => ({ getDb: () => ({}) }))
vi.mock('../../server/utils/context', () => ({ getFeexpay: () => null }))

beforeEach(() => {
  getCandidateWithPhotosMock.mockReset()
  getReceiptMock.mockReset()
  getOperatorsListMock.mockReset()
})

describe('GET /api/candidates/$id', () => {
  it('transmet le paramètre de route au service', async () => {
    getCandidateWithPhotosMock.mockResolvedValue({ status: 200, body: { id: 'c-1' } })
    const { Route } = await import('../../src/routes/api/candidates.$id')
    const res = await Route.options.server.handlers.GET({
      request: new Request('https://awac.test/api/candidates/c-1'),
      params: { id: 'c-1' },
    })
    expect(getCandidateWithPhotosMock.mock.calls[0]?.[1]).toBe('c-1')
    expect(res.status).toBe(200)
  })

  it('reporte le 404 du service', async () => {
    getCandidateWithPhotosMock.mockResolvedValue({
      status: 404,
      body: { error: { code: 'not_found', message: 'Candidat introuvable' } },
    })
    const { Route } = await import('../../src/routes/api/candidates.$id')
    const res = await Route.options.server.handlers.GET({
      request: new Request('https://awac.test/api/candidates/nope'),
      params: { id: 'nope' },
    })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/receipts/$code', () => {
  it('transmet le code de route au service', async () => {
    getReceiptMock.mockResolvedValue({ status: 200, body: { code: 'R-9' } })
    const { Route } = await import('../../src/routes/api/receipts.$code')
    await Route.options.server.handlers.GET({
      request: new Request('https://awac.test/api/receipts/R-9'),
      params: { code: 'R-9' },
    })
    expect(getReceiptMock.mock.calls[0]?.[1]).toBe('R-9')
  })
})

describe('GET /api/payment/operators', () => {
  it('utilise le pays de query', async () => {
    getOperatorsListMock.mockReturnValue({ status: 200, body: [] })
    const { Route } = await import('../../src/routes/api/payment/operators')
    await Route.options.server.handlers.GET({
      request: new Request('https://awac.test/api/payment/operators?country=TG'),
      params: {},
    })
    expect(getOperatorsListMock.mock.calls[0]?.[1]).toBe('TG')
  })

  it('retombe sur BJ quand le pays est absent', async () => {
    getOperatorsListMock.mockReturnValue({ status: 200, body: [] })
    const { Route } = await import('../../src/routes/api/payment/operators')
    await Route.options.server.handlers.GET({
      request: new Request('https://awac.test/api/payment/operators'),
      params: {},
    })
    expect(getOperatorsListMock.mock.calls[0]?.[1]).toBe('BJ')
  })
})
