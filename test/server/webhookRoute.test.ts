import { describe, it, expect, vi, beforeEach } from 'vitest'

const processWebhookMock = vi.fn()
vi.mock('../../server/services/votes', () => ({ processWebhook: processWebhookMock }))
vi.mock('../../server/lib/db', () => ({ getDb: () => ({}) }))
vi.mock('../../server/utils/context', () => ({
  getFeexpay: () => null,
  getFeexpayWebhookSecret: () => 'secret-de-test',
}))

beforeEach(() => processWebhookMock.mockReset())

async function callWebhook(rawBody: string, url: string) {
  const { Route } = await import('../../src/routes/api/votes/webhook')
  const handler = Route.options.server.handlers.POST
  return handler({ request: new Request(url, { method: 'POST', body: rawBody }), params: {} })
}

describe('POST /api/votes/webhook', () => {
  it('transmet le corps brut octet pour octet, sans re-sérialisation', async () => {
    processWebhookMock.mockResolvedValue({ status: 200, body: { ok: true } })
    const raw = '{"reference":"REF-1","status":"SUCCESSFUL","amount":100}'
    await callWebhook(raw, 'https://awac.test/api/votes/webhook')
    expect(processWebhookMock.mock.calls[0]?.[1]).toBe(raw)
  })

  it('transmet le token de query au service', async () => {
    processWebhookMock.mockResolvedValue({ status: 200, body: { ok: true } })
    await callWebhook('{}', 'https://awac.test/api/votes/webhook?token=abc123')
    expect(processWebhookMock.mock.calls[0]?.[2]).toBe('abc123')
  })

  it('transmet null quand le token est absent', async () => {
    processWebhookMock.mockResolvedValue({ status: 200, body: { ok: true } })
    await callWebhook('{}', 'https://awac.test/api/votes/webhook')
    expect(processWebhookMock.mock.calls[0]?.[2]).toBeNull()
  })

  it('reporte le status renvoyé par le service', async () => {
    processWebhookMock.mockResolvedValue({
      status: 401,
      body: { error: { code: 'unauthorized', message: 'Signature invalide' } },
    })
    const res = await callWebhook('{}', 'https://awac.test/api/votes/webhook')
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({
      error: { code: 'unauthorized', message: 'Signature invalide' },
    })
  })
})
