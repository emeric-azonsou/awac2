import { describe, it, expect, vi, beforeEach } from 'vitest'

const getPhotoFileMock = vi.fn()
const storePhotoFileMock = vi.fn()
const requireAdminSessionMock = vi.fn()

vi.mock('../../server/services/admin/photos', () => ({
  getPhotoFile: getPhotoFileMock,
  storePhotoFile: storePhotoFileMock,
}))
vi.mock('../../server/lib/adminSession', () => ({
  requireAdminSession: requireAdminSessionMock,
}))
vi.mock('../../server/lib/db', () => ({ getDb: () => ({}) }))

beforeEach(() => {
  getPhotoFileMock.mockReset()
  storePhotoFileMock.mockReset()
  requireAdminSessionMock.mockReset().mockResolvedValue({ adminId: 'admin-1' })
})

describe('GET /api/photos/$id', () => {
  it("renvoie les octets de l'image avec son content-type et un cache immuable", async () => {
    const data = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    getPhotoFileMock.mockResolvedValue({ contentType: 'image/png', data })
    const { Route } = await import('../../src/routes/api/photos.$id')
    const res = await Route.options.server.handlers.GET({
      request: new Request('https://awac.test/api/photos/p-1'),
      params: { id: 'p-1' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(Buffer.from(await res.arrayBuffer())).toEqual(data)
  })

  it("renvoie l'enveloppe d'erreur 404 quand la photo n'existe pas", async () => {
    getPhotoFileMock.mockResolvedValue(null)
    const { Route } = await import('../../src/routes/api/photos.$id')
    const res = await Route.options.server.handlers.GET({
      request: new Request('https://awac.test/api/photos/nope'),
      params: { id: 'nope' },
    })
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: { code: 'not_found', message: 'Photo introuvable' },
    })
  })
})

describe('POST /api/admin/photos', () => {
  it('transmet le corps binaire brut au service, octet pour octet', async () => {
    storePhotoFileMock.mockResolvedValue({ status: 201, body: { id: 'blob-1' } })
    const bytes = Buffer.from([1, 2, 3, 4, 5])
    const { Route } = await import('../../src/routes/api/admin/photos/index')
    await Route.options.server.handlers.POST({
      request: new Request('https://awac.test/api/admin/photos', { method: 'POST', body: bytes }),
      params: {},
    })
    expect(storePhotoFileMock.mock.calls[0]?.[1]).toEqual(bytes)
  })

  it('refuse la requête sans session admin', async () => {
    requireAdminSessionMock.mockRejectedValue(
      Object.assign(new Error('Authentification requise'), { status: 401, code: 'unauthorized' }),
    )
    const { Route } = await import('../../src/routes/api/admin/photos/index')
    const res = await Route.options.server.handlers.POST({
      request: new Request('https://awac.test/api/admin/photos', { method: 'POST', body: 'x' }),
      params: {},
    })
    expect(res.status).toBe(401)
    expect(storePhotoFileMock).not.toHaveBeenCalled()
  })
})
