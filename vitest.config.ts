import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  // Les tests de composant sont en .tsx et ont besoin de la transformation JSX.
  // Ils déclarent leur environnement jsdom par docblock, fichier par fichier :
  // les tests serveur restent en environnement node, qui est plus rapide.
  plugins: [viteReact()],
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
})
