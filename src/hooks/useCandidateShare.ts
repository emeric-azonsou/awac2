import { useCallback, useEffect, useState } from 'react'
import {
  buildCandidateShareUrl,
  buildFacebookShareUrl,
  buildShareMessage,
  buildShareText,
  buildWhatsAppShareUrl,
} from '../utils/candidateShare'
import { useCopyToClipboard } from './useCopyToClipboard'
import { useSiteOrigin } from './useSiteOrigin'

interface ShareCandidate {
  id: string
  full_name: string
}

export function useCandidateShare(candidate: ShareCandidate | null) {
  const siteOrigin = useSiteOrigin()
  const shareUrl = candidate ? buildCandidateShareUrl(siteOrigin, candidate.id) : ''
  const shareMessage = candidate ? buildShareMessage(candidate.full_name, shareUrl) : ''
  const whatsappShareUrl = buildWhatsAppShareUrl(shareMessage)
  const facebookShareUrl = buildFacebookShareUrl(shareUrl)

  const { copied, copy } = useCopyToClipboard()
  const copyShareLink = useCallback(() => copy(shareUrl), [copy, shareUrl])

  // useState + useEffect (pas une valeur dérivée) pour éviter un mismatch
  // d'hydratation : navigator n'existe pas côté serveur.
  const [canNativeShare, setCanNativeShare] = useState(false)
  useEffect(() => {
    setCanNativeShare(typeof navigator.share === 'function')
  }, [])

  const nativeShare = useCallback(async () => {
    if (!candidate) return
    try {
      await navigator.share({
        title: buildShareText(candidate.full_name),
        text: buildShareText(candidate.full_name),
        url: shareUrl,
      })
    } catch {
      // Annulation utilisateur (AbortError) : silencieux, rien à faire.
    }
  }, [candidate, shareUrl])

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
