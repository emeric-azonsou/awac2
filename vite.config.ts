import { defineConfig, type Plugin } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'

// En dev, le middleware de Nitro (nitro/dist/_build/vite.dev.mjs) classe comme
// asset statique toute requête dont `Sec-Fetch-Dest` n'est ni document, ni
// iframe, ni frame, et la laisse tomber dans le service de fichiers de Vite —
// sauf si la route est enregistrée nommément côté Nitro. Les routes serveur de
// TanStack Start passent par le catch-all, elles ne le sont donc pas.
//
// Conséquence mesurée : <img src="/api/photos/…"> reçoit 404 en dev alors que
// la même URL répond 200 image/jpeg sur le build de production. Les neuf photos
// de candidats basculaient sur l'image par défaut.
//
// On retire l'en-tête pour les seules requêtes /api/. Elles retombent alors
// dans la branche `isAssetByExt` du middleware : sans extension de fichier,
// elles ne sont plus vues comme des assets et repartent vers Nitro.
//
// Pas de `enforce: 'pre'` : la première position dans `plugins` suffit à passer
// avant le middleware de Nitro, sans se placer avant les middlewares internes
// de Vite. `apply: 'serve'` garantit que rien de ceci n'existe dans le build.
function apiRequestsAreNotAssets(): Plugin {
  return {
    name: 'awac:api-requests-are-not-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith('/api/')) delete req.headers['sec-fetch-dest']
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [apiRequestsAreNotAssets(), tanstackStart(), nitro(), viteReact()],
})
