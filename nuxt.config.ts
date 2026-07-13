import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-13',
  srcDir: 'app/',
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'AWAC',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Open+Sans:wght@300;400;500;600;700&display=swap',
        },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/icon?family=Material+Icons' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined' },
      ],
    },
  },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxtjs/supabase'],
  css: ['~/assets/css/tailwind.css'],
  hooks: {
    // Restaure l'enveloppe d'erreur historique { error: { code, message } }
    // pour les throws inattendus sur /api/*, sans toucher au rendu d'erreur
    // Nuxt des pages HTML : notre handler est prepended devant celui que
    // Nuxt vient d'assigner (ci-dessus dans nitroConfig.errorHandler) et ne
    // "handle" la réponse (via send()) que pour /api/* ; sinon il ne fait
    // rien et la chaîne Nitro passe au handler par défaut de Nuxt.
    'nitro:config': (nitroConfig) => {
      const configuredHandlers = Array.isArray(nitroConfig.errorHandler)
        ? nitroConfig.errorHandler
        : [nitroConfig.errorHandler]
      const existingHandlers = configuredHandlers.filter((handler): handler is string => Boolean(handler))
      nitroConfig.errorHandler = [
        fileURLToPath(new URL('./server/lib/apiErrorHandler.ts', import.meta.url)),
        ...existingHandlers,
      ]
    },
  },
  tailwindcss: { configPath: '~~/tailwind.config.ts' },
  supabase: {
    // pas de redirection auto pour l'instant (auth traitée en phase 3)
    redirect: false,
  },
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
      },
    },
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
