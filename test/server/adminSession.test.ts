import { describe, it, expect, vi, beforeEach } from 'vitest'

const sessionData = { adminId: 'admin-1', email: 'a@awac.bj', fullName: 'Emeric', tokenVersion: 3 }
const useSessionMock = vi.fn()
const dbMock = vi.fn()

vi.mock('@tanstack/react-start/server', () => ({
  useSession: (...args: unknown[]) => useSessionMock(...args),
}))
vi.mock('../../server/lib/db', () => ({ getDb: () => dbMock }))

beforeEach(() => {
  vi.resetModules()
  useSessionMock.mockReset()
  dbMock.mockReset()
  process.env.SESSION_SECRET = 'x'.repeat(32)
})

describe('requireAdminSession', () => {
  it('accepte une session dont le token_version correspond à la base', async () => {
    useSessionMock.mockResolvedValue({ data: sessionData })
    dbMock.mockResolvedValue([{ token_version: 3 }])
    const { requireAdminSession } = await import('../../server/lib/adminSession')
    await expect(requireAdminSession()).resolves.toMatchObject({ adminId: 'admin-1' })
  })

  it('refuse une session dont le token_version a été incrémenté', async () => {
    useSessionMock.mockResolvedValue({ data: sessionData })
    dbMock.mockResolvedValue([{ token_version: 4 }])
    const { requireAdminSession } = await import('../../server/lib/adminSession')
    await expect(requireAdminSession()).rejects.toMatchObject({ status: 401 })
  })

  it("refuse une session dont l'admin n'existe plus", async () => {
    useSessionMock.mockResolvedValue({ data: sessionData })
    dbMock.mockResolvedValue([])
    const { requireAdminSession } = await import('../../server/lib/adminSession')
    await expect(requireAdminSession()).rejects.toMatchObject({ status: 401 })
  })

  it('refuse une session vide', async () => {
    useSessionMock.mockResolvedValue({ data: {} })
    const { requireAdminSession } = await import('../../server/lib/adminSession')
    await expect(requireAdminSession()).rejects.toMatchObject({ status: 401 })
  })

  it('refuse de démarrer si SESSION_SECRET fait moins de 32 caractères', async () => {
    process.env.SESSION_SECRET = 'trop-court'
    const { getAdminSession } = await import('../../server/lib/adminSession')
    await expect(async () => getAdminSession()).rejects.toThrow(/SESSION_SECRET/)
  })

  it('configure le cookie avec les attributs de sécurité attendus', async () => {
    useSessionMock.mockResolvedValue({ data: sessionData })
    const { getAdminSession } = await import('../../server/lib/adminSession')
    await getAdminSession()
    expect(useSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'awac_admin',
        maxAge: 12 * 60 * 60,
        cookie: expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      }),
    )
  })
})
