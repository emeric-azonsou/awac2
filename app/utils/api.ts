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
