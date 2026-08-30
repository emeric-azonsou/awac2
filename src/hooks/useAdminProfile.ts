import { api } from '../utils/api'

export interface AdminProfileState {
  id: string
  email: string
  full_name: string
}

// Remplace useState('admin-profile') de Nuxt : le profil est mis en cache dans
// le contexte du routeur par le beforeLoad de la coquille admin, pas dans un
// état global. Ce module ne garde que l'appel et son type.
export function fetchAdminProfile(): Promise<AdminProfileState> {
  return api.get<AdminProfileState>('/admin/me')
}

export function loginAdmin(email: string, password: string): Promise<AdminProfileState> {
  return api.post<AdminProfileState>('/admin/login', { email, password })
}

export function logoutAdmin(): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>('/admin/logout', {})
}
