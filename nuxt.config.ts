// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-13',
  srcDir: 'app/',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/tailwind.css'],
  tailwindcss: { configPath: '~~/tailwind.config.ts' },
  runtimeConfig: {
    // serveur-only (jamais dans le bundle client)
    databaseUrl: '',
    sebpayPublicKey: '',
    sebpaySecretKey: '',
    sebpayBaseUrl: '',
    sebpayCallbackUrl: '',
    supabaseServiceRoleKey: '',
    public: {
      // exposé au client
      supabaseUrl: '',
      supabaseAnonKey: '',
    },
  },
})
