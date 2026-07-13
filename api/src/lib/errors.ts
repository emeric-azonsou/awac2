import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export interface ErrorEntry {
  status: ContentfulStatusCode
  code: string
  message: string
}

export function errorResponse(c: Context, status: ContentfulStatusCode, code: string, message: string) {
  return c.json({ error: { code, message } }, status)
}

export const ERRORS = Object.freeze({
  UNAUTHORIZED: { status: 401, code: 'unauthorized', message: 'Authentification requise' },
  INVALID_CREDENTIALS: { status: 401, code: 'invalid_credentials', message: 'Email ou mot de passe incorrect' },
  FORBIDDEN: { status: 403, code: 'forbidden', message: 'Accès refusé' },
  NOT_FOUND: { status: 404, code: 'not_found', message: 'Ressource introuvable' },
  VALIDATION: { status: 400, code: 'validation_error', message: 'Données invalides' },
  CONFLICT: { status: 409, code: 'conflict', message: 'Conflit' },
  LOCKED: { status: 409, code: 'locked', message: 'Ressource verrouillée' },
}) satisfies Record<string, ErrorEntry>

export function sendError(c: Context, entry: ErrorEntry, messageOverride?: string) {
  return errorResponse(c, entry.status, entry.code, messageOverride ?? entry.message)
}
