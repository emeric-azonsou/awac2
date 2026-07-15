import { computed, onMounted, ref, type Ref } from 'vue'
import {
  buildCandidateShareUrl,
  buildFacebookShareUrl,
  buildShareMessage,
  buildShareText,
  buildWhatsAppShareUrl,
} from '~/utils/candidateShare'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
import { useSiteOrigin } from '~/composables/useSiteOrigin'

interface ShareCandidate {
  id: string
  full_name: string
}

export function useCandidateShare(candidate: Ref<ShareCandidate | null>) {
  const siteOrigin = useSiteOrigin()
  const shareUrl = computed(() =>
    candidate.value ? buildCandidateShareUrl(siteOrigin.value, candidate.value.id) : '',
  )
  const shareMessage = computed(() =>
    candidate.value ? buildShareMessage(candidate.value.full_name, shareUrl.value) : '',
  )
  const whatsappShareUrl = computed(() => buildWhatsAppShareUrl(shareMessage.value))
  const facebookShareUrl = computed(() => buildFacebookShareUrl(shareUrl.value))

  const { copied, copy } = useCopyToClipboard()
  const copyShareLink = () => copy(shareUrl.value)

  // ref + onMounted (pas un computed) pour éviter un mismatch d'hydratation :
  // navigator n'existe pas côté serveur.
  const canNativeShare = ref(false)
  onMounted(() => {
    canNativeShare.value = typeof navigator.share === 'function'
  })

  const nativeShare = async () => {
    if (!candidate.value) return
    try {
      await navigator.share({
        title: buildShareText(candidate.value.full_name),
        text: buildShareText(candidate.value.full_name),
        url: shareUrl.value,
      })
    } catch {
      // Annulation utilisateur (AbortError) : silencieux, rien à faire.
    }
  }

  return {
    shareUrl,
    shareMessage,
    whatsappShareUrl,
    facebookShareUrl,
    copied,
    copyShareLink,
    canNativeShare,
    nativeShare,
  }
}
