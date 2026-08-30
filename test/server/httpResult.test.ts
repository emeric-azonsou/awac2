import { describe, it, expect } from 'vitest'
import { jsonResult, errorResponse, toErrorResponse } from '../../server/lib/httpResult'

describe('jsonResult', () => {
  it('reporte le status et sérialise le body en JSON', async () => {
    const res = jsonResult({ status: 201, body: { id: 'abc' } })
    expect(res.status).toBe(201)
    expect(res.headers.get('content-type')).toContain('application/json')
    await expect(res.json()).resolves.toEqual({ id: 'abc' })
  })
})

describe('errorResponse', () => {
  it("produit l'enveloppe d'erreur historique", async () => {
    const res = errorResponse(401, 'unauthorized', 'Authentification requise')
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({
      error: { code: 'unauthorized', message: 'Authentification requise' },
    })
  })
})

describe('toErrorResponse', () => {
  it('convertit une HttpError en son status et son code', async () => {
    const err = Object.assign(new Error('Authentification requise'), {
      status: 401,
      code: 'unauthorized',
    })
    const res = toErrorResponse(err)
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({
      error: { code: 'unauthorized', message: 'Authentification requise' },
    })
  })

  it('masque les erreurs inattendues derrière une 500 générique', async () => {
    const res = toErrorResponse(new Error('connexion postgres perdue'))
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({
      error: { code: 'internal_error', message: 'Une erreur interne est survenue' },
    })
  })

  it("ne laisse jamais fuiter le message d'une erreur inattendue", async () => {
    const res = toErrorResponse(new Error('DATABASE_URL=postgres://user:secret@host/db'))
    const text = await res.text()
    expect(text).not.toContain('secret')
  })
})
