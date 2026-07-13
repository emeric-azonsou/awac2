import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { errorResponse, sendError, ERRORS } from '../src/lib/errors.ts'
import { readJson } from './helpers.ts'

describe('error helpers', () => {
  it('errorResponse shapes the body and status', async () => {
    const app = new Hono()
    app.get('/x', (c) => errorResponse(c, 400, 'bad_input', 'Champ invalide'))
    const res = await app.request('/x')
    expect(res.status).toBe(400)
    expect(await readJson(res)).toEqual({ error: { code: 'bad_input', message: 'Champ invalide' } })
  })

  it('sendError uses an ERRORS entry', async () => {
    const app = new Hono()
    app.get('/y', (c) => sendError(c, ERRORS.INVALID_CREDENTIALS))
    const res = await app.request('/y')
    expect(res.status).toBe(401)
    expect((await readJson(res)).error.code).toBe('invalid_credentials')
  })

  it('sendError allows overriding the message', async () => {
    const app = new Hono()
    app.get('/z', (c) => sendError(c, ERRORS.VALIDATION, 'La somme doit valoir 100'))
    const res = await app.request('/z')
    expect(await readJson(res)).toEqual({ error: { code: 'validation_error', message: 'La somme doit valoir 100' } })
  })
})
