import { describe, it, expect } from 'vitest'
import { toApiErrorBody } from '../../server/lib/apiError'

describe('toApiErrorBody', () => {
  it('404 → enveloppe not_found', () => {
    expect(toApiErrorBody(404)).toEqual({
      status: 404,
      body: { error: { code: 'not_found', message: 'Ressource introuvable' } },
    })
  })

  it('500 → enveloppe internal_error', () => {
    expect(toApiErrorBody(500)).toEqual({
      status: 500,
      body: { error: { code: 'internal_error', message: 'Une erreur interne est survenue' } },
    })
  })

  it('un autre code inattendu (ex. 502) → enveloppe internal_error', () => {
    expect(toApiErrorBody(502)).toEqual({
      status: 500,
      body: { error: { code: 'internal_error', message: 'Une erreur interne est survenue' } },
    })
  })
})
