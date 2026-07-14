import { send, setResponseHeader, setResponseStatus, type H3Event } from 'h3'
import { toApiErrorBody } from './apiError'

const API_PATH_PREFIX = '/api/'
const DEFAULT_ERROR_STATUS = 500
const NOT_FOUND_STATUS = 404

interface NitroThrownError {
  statusCode?: number
  status?: number
}

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
