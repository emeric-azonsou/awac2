export interface ErrorEntry {
  status: number
  code: string
  message: string
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

export interface HttpResult {
  status: number
  body: unknown
}

export function ok(body: unknown, status = 200): HttpResult {
  return { status, body }
}

export function fail(entry: ErrorEntry, message?: string): HttpResult {
  return { status: entry.status, body: { error: { code: entry.code, message: message ?? entry.message } } }
}
