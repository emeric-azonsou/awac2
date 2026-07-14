import { send, setResponseHeader, setResponseStatus, type H3Event } from 'h3'
import { toApiErrorBody } from './apiError'

const API_PATH_PREFIX = '/api/'
const DEFAULT_ERROR_STATUS = 500
const NOT_FOUND_STATUS = 404

interface NitroThrownError {
  statusCode?: number
  status?: number
}

/**
 * Handler d'erreur Nitro (référencé via `nitro:config` dans nuxt.config.ts).
 * Ne traite QUE les requêtes `/api/*` : restaure l'enveloppe historique
 * `{ error: { code, message } }` pour les throws inattendus et les 404 de
 * route API inconnue. Pour tout le reste (pages Nuxt), ne fait rien : le
 * handler suivant dans la chaîne (le rendu d'erreur Nuxt par défaut) prend
 * la main normalement.
 */
export default async function apiErrorEnvelopeHandler(
  error: NitroThrownError,
  event: H3Event,
): Promise<void> {
  if (!event.path?.startsWith(API_PATH_PREFIX)) return

  const statusCode = error.statusCode ?? error.status ?? DEFAULT_ERROR_STATUS
  if (statusCode !== NOT_FOUND_STATUS) console.error(error)

  const { status, body } = toApiErrorBody(statusCode)
  setResponseStatus(event, status)
  setResponseHeader(event, 'content-type', 'application/json')
  await send(event, JSON.stringify(body))
}
