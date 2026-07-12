<template>
  <div class="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <img src="/src/assets/img/awac.png" alt="AWAC MONO" class="h-16 mx-auto mb-4" />
        <h1 class="text-2xl font-heading font-black text-gray-900">AWAC MONO</h1>
        <p class="text-sm text-gray-500">Administration</p>
      </div>

      <div class="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl p-6 md:p-8">
        <h2 class="text-xl font-heading font-black text-gray-900 mb-6">Connexion</h2>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Identifiant ou Email</label>
            <input
              v-model="loginInput"
              type="text"
              required
              autocomplete="username"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all bg-white/50"
              placeholder="admin ou admin@awac.local"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Mot de passe</label>
            <input
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all bg-white/50"
              placeholder="••••••••"
            />
          </div>

          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" v-model="rememberMe" class="accent-awac-primary" />
              Se souvenir de moi
            </label>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 bg-awac-primary text-white font-semibold rounded-xl hover:bg-awac-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <span v-if="loading" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
            {{ loading ? 'Connexion...' : 'Se connecter' }}
          </button>

          <p v-if="error" class="text-sm text-red-500 text-center">{{ error }}</p>
          <p v-if="debugInfo" class="text-xs text-gray-400 text-center">{{ debugInfo }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/services/supabase'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const loginInput = ref('admin')
const password = ref('Admin123!')
const rememberMe = ref(false)
const loading = ref(false)
const error = ref('')
const debugInfo = ref('')

const handleLogin = async () => {
  error.value = ''
  debugInfo.value = ''
  loading.value = true

  try {
    let email = loginInput.value.trim()
    if (!email.includes('@')) {
      email = `${email}@awac.local`
    }

    debugInfo.value = `Tentative avec: ${email}`

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password.value,
    })

    if (signInError) {
      debugInfo.value = `Erreur: ${signInError.message}`
      throw signInError
    }

    debugInfo.value = `✅ Connecté: ${data.user.email}`

    if (rememberMe.value) {
      localStorage.setItem('awac_remember_me', 'true')
    } else {
      localStorage.removeItem('awac_remember_me')
    }

    await userStore.fetchUser()
    router.push('/admin')
  } catch (err) {
    console.error('Erreur de connexion:', err)
    error.value = err.message || 'Identifiants incorrects. Vérifiez votre identifiant et votre mot de passe.'
  } finally {
    loading.value = false
  }
}
</script>