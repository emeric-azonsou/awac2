import { ref } from 'vue'

// Copie de texte dans le presse-papier avec retour visuel « copié » temporaire.
// Repli execCommand pour les contextes où l'API clipboard est indisponible
// (http, permissions refusées) — fréquent sur mobiles bas de gamme.
export function useCopyToClipboard(resetMs = 2000) {
  const copied = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  const copy = async (text: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const field = document.createElement('textarea')
      field.value = text
      field.setAttribute('readonly', '')
      field.style.position = 'absolute'
      field.style.left = '-9999px'
      document.body.appendChild(field)
      field.select()
      document.execCommand('copy')
      document.body.removeChild(field)
    }
    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (copied.value = false), resetMs)
  }

  return { copied, copy }
}
