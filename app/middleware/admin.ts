// Garde des pages /admin/* : vérifie la session (cookie httpOnly) via l'API.
// Le profil est mis en cache dans useState pour éviter un appel par navigation.
export interface AdminProfileState {
  id: string
  email: string
  full_name: string
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/admin/login') return

  const adminProfile = useState<AdminProfileState | null>('admin-profile', () => null)
  if (adminProfile.value) return

  try {
    adminProfile.value = await $fetch<AdminProfileState>('/api/admin/me', {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    })
  } catch {
    return navigateTo('/admin/login')
  }
})
