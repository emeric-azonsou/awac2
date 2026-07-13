// Client API same-origin pour la vitrine publique.
// Porte src/services/api.js sur $fetch (Nuxt) : base URL relative /api,
// pas de VITE_API_URL. Auth (Bearer token) omise ici, réintroduite en Phase 3 (admin).

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

interface FetchErrorLike {
  data?: { error?: { code?: string; message?: string } }
  statusCode?: number
}

const DEFAULT_ERROR_CODE = 'unknown_error'
const DEFAULT_ERROR_MESSAGE = 'Une erreur est survenue'
const DEFAULT_ERROR_STATUS = 500

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    // $fetch typed overloads infer the response/method/body types from a literal
    // request URL; this generic wrapper only knows them at runtime, so the method
    // and body need a narrow, documented cast to satisfy the overload resolution.
    const response = await $fetch<T>(`/api${path}`, {
      method: (options.method ?? 'GET') as never,
      body: options.body as never,
    })
    return response as T
  } catch (err: unknown) {
    const fetchError = err as FetchErrorLike
    const code = fetchError.data?.error?.code ?? DEFAULT_ERROR_CODE
    const message = fetchError.data?.error?.message ?? DEFAULT_ERROR_MESSAGE
    throw new ApiError(code, message, fetchError.statusCode ?? DEFAULT_ERROR_STATUS)
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
}
