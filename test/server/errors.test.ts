import { describe, it, expect } from 'vitest'
import { ok, fail, ERRORS } from '../../server/lib/errors'
describe('HttpResult helpers', () => {
  it('ok() enveloppe le corps avec 200 par défaut', () => {
    expect(ok({ a: 1 })).toEqual({ status: 200, body: { a: 1 } })
  })
  it('ok() accepte un statut explicite', () => {
    expect(ok({ id: 'x' }, 201)).toEqual({ status: 201, body: { id: 'x' } })
  })
  it('fail() construit le corps erreur depuis une entrée ERRORS', () => {
    expect(fail(ERRORS.NOT_FOUND)).toEqual({
      status: 404,
      body: { error: { code: 'not_found', message: 'Ressource introuvable' } },
    })
  })
  it('fail() autorise un message override', () => {
    expect(fail(ERRORS.VALIDATION, 'Champ X invalide')).toEqual({
      status: 400,
      body: { error: { code: 'validation_error', message: 'Champ X invalide' } },
    })
  })
})
