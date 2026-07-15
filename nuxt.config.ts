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
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon-180.png' },
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
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
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
    feexpayApiKey: process.env.FEEXPAY_API_KEY ?? '',
    feexpayShopId: process.env.FEEXPAY_SHOP_ID ?? '',
    feexpayBaseUrl: process.env.FEEXPAY_BASE_URL ?? '',
    feexpayWebhookSecret: process.env.FEEXPAY_WEBHOOK_SECRET ?? '',
    sessionSecret: process.env.SESSION_SECRET ?? '',
  },
})
