<template>
  <div
    class="min-h-screen bg-awac-dark flex items-center justify-center px-6 selection:bg-awac-primary/20"
  >
    <div class="w-full max-w-sm space-y-8">
      <div class="text-center space-y-3">
        <img
          src="@/assets/img/awac.png"
          alt="AWAC"
          class="h-16 w-auto mx-auto brightness-0 invert"
        />
        <h1 class="text-white font-heading font-black text-2xl tracking-tight uppercase">
          Espace admin
        </h1>
        <p class="text-white/50 font-sans text-sm">Awards des Couturier·e·s du Mono</p>
      </div>

      <form
        class="bg-white rounded-[2.5rem_0_2.5rem_0] shadow-2xl p-8 space-y-5"
        @submit.prevent="submitLogin"
      >
        <div class="space-y-1">
          <label
            for="admin-email"
            class="block text-xs font-semibold text-gray-500 uppercase tracking-wider"
          >
            Email
          </label>
          <input
            id="admin-email"
            v-model="form.email"
            type="email"
            autocomplete="username"
            required
            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
          />
        </div>

        <div class="space-y-1">
          <label
            for="admin-password"
            class="block text-xs font-semibold text-gray-500 uppercase tracking-wider"
          >
            Mot de passe
          </label>
          <input
            id="admin-password"
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-awac-primary focus:ring-2 focus:ring-awac-primary/20 outline-none transition-all text-sm"
          />
        </div>

        <p v-if="errorMessage" class="text-sm text-red-500" role="alert">{{ errorMessage }}</p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-awac-primary to-awac-accent text-white font-heading font-black text-[11px] tracking-widest uppercase py-3.5 rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0"
        >
          <span
            v-if="submitting"
            class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"
          ></span>
          {{ submitting ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminProfileState } from '~/middleware/admin'
const router = useRouter()
const adminProfile = useState<AdminProfileState | null>('admin-profile', () => null)
const form = ref({ email: '', password: '' })
const submitting = ref(false)
const errorMessage = ref('')
const submitLogin = async () => {
  submitting.value = true
  errorMessage.value = ''
  try {
    adminProfile.value = await $fetch<AdminProfileState>('/api/admin/login', {
      method: 'POST',
      body: { email: form.value.email, password: form.value.password },
    })
    router.push('/admin')
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    errorMessage.value =
      status === 429
        ? 'Trop de tentatives — réessayez dans quelques minutes.'
        : 'Identifiants invalides.'
  } finally {
    submitting.value = false
  }
}
</script>
