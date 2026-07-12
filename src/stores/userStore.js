// src/stores/userStore.js
import { defineStore } from 'pinia'
import { getCurrentUserWithProfile } from '@/services/authService'
import { supabase } from '@/services/supabase'  // ← Import direct depuis le bon dossier

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    profile: null,
    isLoading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isSuperAdmin: (state) => state.profile?.role === 'super_admin',
    userFullName: (state) => {
      if (state.profile?.full_name) return state.profile.full_name
      if (state.user?.email) return state.user.email.split('@')[0]
      return 'Utilisateur'
    },
    userEmail: (state) => state.user?.email || '',
    userRole: (state) => state.profile?.role || 'admin',
    userInitial: (state) => {
      const name = state.profile?.full_name || state.user?.email || 'U'
      return name.charAt(0).toUpperCase()
    },
  },

  actions: {
    async fetchUser() {
      this.isLoading = true
      this.error = null
      try {
        const result = await getCurrentUserWithProfile()
        if (result) {
          this.user = result
          this.profile = result.profile || null
        } else {
          this.user = null
          this.profile = null
        }
      } catch (err) {
        console.error('❌ Erreur fetchUser:', err)
        this.error = err.message
      } finally {
        this.isLoading = false
      }
    },

    async logout() {
      await supabase.auth.signOut()  // ← Plus besoin d'import dynamique
      this.user = null
      this.profile = null
    },
  },
})