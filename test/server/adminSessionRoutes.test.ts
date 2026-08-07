import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyAdminLoginMock = vi.fn()
const sessionUpdate = vi.fn()
const sessionClear = vi.fn()
const getAdminSessionMock = vi.fn()
const requireAdminSessionMock = vi.fn()
const dbMock = vi.fn()

vi.mock('../../server/services/admin/auth', () => ({ verifyAdminLogin: verifyAdminLoginMock }))
vi.mock('../../server/lib/adminSession', () => ({
  getAdminSession: getAdminSessionMock,
  requireAdminSession: requireAdminSessionMock,
}))
vi.mock('../../server/lib/db', () => ({ getDb: () => dbMock }))

beforeEach(() => {
  verifyAdminLoginMock.mockReset()
  sessionUpdate.mockReset()
  sessionClear.mockReset()
  dbMock.mockReset().mockResolvedValue([])
  getAdminSessionMock.mockReset().mockResolvedValue({
    data: { adminId: 'admin-1' },
    update: sessionUpdate,
    clear: sessionClear,
  })
  requireAdminSessionMock.mockReset()
})

function loginRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://awac.test/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/login', () => {
  it("transmet l'IP client issue de x-forwarded-for au limiteur de tentatives", async () => {
    verifyAdminLoginMock.mockResolvedValue({
      status: 401,
      body: { error: { code: 'unauthorized', message: 'Identifiants invalides' } },
    })
    const { Route } = await import('../../src/routes/api/admin/login')
    await Route.options.server.handlers.POST({
      request: loginRequest(
        { email: 'a@awac.bj', password: 'x' },
        { 'x-forwarded-for': '41.2.3.4, 10.0.0.1' },
      ),
      params: {},
    })
    expect(verifyAdminLoginMock.mock.calls[0]?.[1]).toMatchObject({ clientIp: '41.2.3.4' })
  })

  it("retombe sur 'ip-inconnue' quand aucune IP n'est disponible", async () => {
    verifyAdminLoginMock.mockResolvedValue({ status: 401, body: {} })
    const { Route } = await import('../../src/routes/api/admin/login')
    await Route.options.server.handlers.POST({
      request: loginRequest({ email: 'a@awac.bj', password: 'x' }),
      params: {},
    })
    expect(verifyAdminLoginMock.mock.calls[0]?.[1]).toMatchObject({ clientIp: 'ip-inconnue' })
  })

  it('ouvre la session seulement en cas de succès', async () => {
    verifyAdminLoginMock.mockResolvedValue({
      status: 200,
      body: { id: 'admin-1', email: 'a@awac.bj', full_name: 'Emeric', token_version: 3 },
    })
    const { Route } = await import('../../src/routes/api/admin/login')
    const res = await Route.options.server.handlers.POST({
      request: loginRequest({ email: 'a@awac.bj', password: 'bon' }),
      params: {},
    })
    expect(res.status).toBe(200)
    expect(sessionUpdate).toHaveBeenCalledWith({
      adminId: 'admin-1',
      email: 'a@awac.bj',
      fullName: 'Emeric',
      tokenVersion: 3,
    })
  })

  it("n'ouvre aucune session en cas d'échec", async () => {
    verifyAdminLoginMock.mockResolvedValue({ status: 401, body: {} })
    const { Route } = await import('../../src/routes/api/admin/login')
    await Route.options.server.handlers.POST({
      request: loginRequest({ email: 'a@awac.bj', password: 'faux' }),
      params: {},
    })
    expect(sessionUpdate).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/logout', () => {
  it('incrémente token_version puis vide la session', async () => {
    const { Route } = await import('../../src/routes/api/admin/logout')
    const res = await Route.options.server.handlers.POST({
      request: new Request('https://awac.test/api/admin/logout', { method: 'POST' }),
      params: {},
    })
    expect(dbMock).toHaveBeenCalled()
    expect(dbMock.mock.calls[0]?.[0]?.join('?')).toContain('UPDATE admins SET token_version')
    expect(sessionClear).toHaveBeenCalled()
    await expect(res.json()).resolves.toEqual({ ok: true })
  })
})

describe('GET /api/admin/me', () => {
  it('renvoie le profil de la session courante', async () => {
    requireAdminSessionMock.mockResolvedValue({
      adminId: 'admin-1',
      email: 'a@awac.bj',
      fullName: 'Emeric',
      tokenVersion: 3,
    })
    const { Route } = await import('../../src/routes/api/admin/me')
    const res = await Route.options.server.handlers.GET({
      request: new Request('https://awac.test/api/admin/me'),
      params: {},
    })
    await expect(res.json()).resolves.toEqual({
      id: 'admin-1',
      email: 'a@awac.bj',
      full_name: 'Emeric',
    })
  })

  it('renvoie 401 quand la session est invalide', async () => {
    requireAdminSessionMock.mockRejectedValue(
      Object.assign(new Error('Authentification requise'), { status: 401, code: 'unauthorized' }),
    )
    const { Route } = await import('../../src/routes/api/admin/me')
    const res = await Route.options.server.handlers.GET({
      request: new Request('https://awac.test/api/admin/me'),
      params: {},
    })
    expect(res.status).toBe(401)
  })
})
