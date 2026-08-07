export class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}
interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
}
const DEFAULT_ERROR_CODE = 'unknown_error'
const DEFAULT_ERROR_MESSAGE = 'Une erreur est survenue'
const DEFAULT_ERROR_STATUS = 500

interface ErrorEnvelope {
  error?: { code?: string; message?: string }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    // Panne réseau : pas de réponse du tout, donc pas d'enveloppe à décoder.
    throw new ApiError(DEFAULT_ERROR_CODE, DEFAULT_ERROR_MESSAGE, DEFAULT_ERROR_STATUS)
  }

  if (!response.ok) {
    let envelope: ErrorEnvelope = {}
    try {
      envelope = (await response.json()) as ErrorEnvelope
    } catch {
      // Corps non-JSON (proxy, page d'erreur) : on garde les valeurs par défaut.
    }
    throw new ApiError(
      envelope.error?.code ?? DEFAULT_ERROR_CODE,
      envelope.error?.message ?? DEFAULT_ERROR_MESSAGE,
      response.status || DEFAULT_ERROR_STATUS,
    )
  }

  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
}
