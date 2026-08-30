import { ERRORS, fail, type HttpResult } from './errors'

const INTERNAL_ERROR_MESSAGE = 'Une erreur interne est survenue'

export function toApiErrorBody(statusCode: number): HttpResult {
  if (statusCode === ERRORS.NOT_FOUND.status) return fail(ERRORS.NOT_FOUND)
  if (statusCode === ERRORS.UNAUTHORIZED.status) return fail(ERRORS.UNAUTHORIZED)
  return fail({ status: 500, code: 'internal_error', message: INTERNAL_ERROR_MESSAGE })
}
