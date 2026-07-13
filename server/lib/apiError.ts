import { ERRORS, fail, type HttpResult } from './errors'

const INTERNAL_ERROR_MESSAGE = 'Une erreur interne est survenue'

/**
 * Mappe un statusCode d'erreur inattendue (throw non géré par un service) vers
 * l'enveloppe historique `{ error: { code, message } }` de l'ancienne API Hono.
 * Seul le 404 (route API inconnue) garde son code dédié ; tout le reste est
 * traité comme une erreur interne (statut forcé à 500), comme le faisait
 * `app.onError` côté Hono.
 */
export function toApiErrorBody(statusCode: number): HttpResult {
  if (statusCode === ERRORS.NOT_FOUND.status) return fail(ERRORS.NOT_FOUND)
  return fail({ status: 500, code: 'internal_error', message: INTERNAL_ERROR_MESSAGE })
}
