// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-13',
  srcDir: 'app/',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxtjs/supabase'],
  css: ['~/assets/css/tailwind.css'],
  tailwindcss: { configPath: '~~/tailwind.config.ts' },
  supabase: {
    // pas de redirection auto pour l'instant (auth traitée en phase 3)
    redirect: false,
  },
  runtimeConfig: {
    // serveur-only (jamais dans le bundle client)
    databaseUrl: process.env.DATABASE_URL ?? '',
    sebpayPublicKey: process.env.SEBPAY_PUBLIC_KEY ?? '',
    sebpaySecretKey: process.env.SEBPAY_SECRET_KEY ?? '',
    sebpayBaseUrl: process.env.SEBPAY_BASE_URL ?? '',
    sebpayCallbackUrl: process.env.SEBPAY_CALLBACK_URL ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    public: {
      // exposé au client
      supabaseUrl: process.env.SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.SUPABASE_KEY ?? '',
    },
  },
})
