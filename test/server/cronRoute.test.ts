import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handlerOf } from './routeHelpers'

const reconcileMock = vi.fn()
vi.mock('../../server/services/reconciliation', () => ({ reconcilePendingVotes: reconcileMock }))
vi.mock('../../server/lib/notifier', () => ({ createNotifierFromEnv: () => null }))
vi.mock('../../server/lib/db', () => ({ getDb: () => ({}) }))
vi.mock('../../server/utils/context', () => ({ getFeexpay: () => null }))

beforeEach(() => {
  reconcileMock.mockReset().mockResolvedValue({ checked: 0, updated: 0 })
  process.env.CRON_SECRET = 'secret-cron-de-test'
})

async function callCron(authorization?: string) {
  const { Route } = await import('../../src/routes/api/cron/reconcile')
  return handlerOf(Route, 'GET')({
    request: new Request('https://awac.test/api/cron/reconcile', {
      headers: authorization ? { authorization } : {},
    }),
    params: {},
  })
}

describe('GET /api/cron/reconcile', () => {
  it('accepte le bon secret', async () => {
    const res = await callCron('Bearer secret-cron-de-test')
    expect(res.status).toBe(200)
    expect(reconcileMock).toHaveBeenCalled()
  })

  it('refuse un mauvais secret', async () => {
    const res = await callCron('Bearer mauvais-secret')
    expect(res.status).toBe(401)
    expect(reconcileMock).not.toHaveBeenCalled()
  })

  it('refuse une requête sans header Authorization', async () => {
    const res = await callCron()
    expect(res.status).toBe(401)
    expect(reconcileMock).not.toHaveBeenCalled()
  })

  it("refuse tout appel quand CRON_SECRET est absent du serveur", async () => {
    process.env.CRON_SECRET = ''
    const res = await callCron('Bearer ')
    expect(res.status).toBe(401)
    expect(reconcileMock).not.toHaveBeenCalled()
  })
})
