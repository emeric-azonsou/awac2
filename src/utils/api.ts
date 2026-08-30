export class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
}
const DEFAULT_ERROR_CODE = 'unknown_error'
const DEFAULT_ERROR_MESSAGE = 'Une erreur est survenue'
const DEFAULT_ERROR_STATUS = 500

interface ErrorEnvelope {
  error?: { code?: string; message?: string }
}

// Une URL relative n'a pas de base côté serveur : pendant le rendu SSR (les
// loaders de route), fetch la rejette. On reconstruit l'URL absolue à partir de
// l'origine de la requête entrante. Le test import.meta.env.SSR est remplacé
// statiquement par Vite, donc le module serveur est éliminé du bundle client.
async function resolveUrl(path: string): Promise<string> {
  const relative = `/api${path}`
  if (!import.meta.env.SSR) return relative
  const { getRequest } = await import('@tanstack/react-start/server')
  return new URL(relative, new URL(getRequest().url).origin).toString()
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(await resolveUrl(path), {
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
  // PATCH et DELETE servent l'administration des candidats et des photos.
  request: <T>(path: string, method: HttpMethod, body?: unknown) =>
    request<T>(path, { method, body }),
}
