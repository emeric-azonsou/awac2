const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
const TOKEN_STORAGE_KEY = 'awac_token'

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) return null

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const code = payload?.error?.code || 'unknown_error'
    const message = payload?.error?.message || 'Une erreur est survenue'
    throw new ApiError(code, message, response.status)
  }
  return payload
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  setToken: (token) => localStorage.setItem(TOKEN_STORAGE_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_STORAGE_KEY),
  getToken: () => localStorage.getItem(TOKEN_STORAGE_KEY),
}
