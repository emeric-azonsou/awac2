import { resolveSiteOrigin } from '../utils/candidateShare'

// VITE_SITE_URL remplace NUXT_PUBLIC_SITE_URL. Quand elle est absente, on
// retombe sur l'origine du navigateur ; côté serveur il n'y a pas d'origine
// disponible sans contexte de requête, d'où la chaîne vide — c'est aussi ce que
// produisait l'ancien code tant que le rendu n'avait pas atteint le client.
export function useSiteOrigin(): string {
  const configured = import.meta.env.VITE_SITE_URL ?? ''
  const requestOrigin = typeof window === 'undefined' ? '' : window.location.origin
  return resolveSiteOrigin(configured, requestOrigin)
}
