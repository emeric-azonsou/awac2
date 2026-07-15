const SHARE_QUERY_PARAM = 'vote'
const SHARE_QUERY_VALUE = '1'
const WHATSAPP_SHARE_BASE_URL = 'https://wa.me/?text='
const FACEBOOK_SHARE_BASE_URL = 'https://www.facebook.com/sharer/sharer.php?u='

export function buildCandidateShareUrl(origin: string, candidateId: string): string {
  return `${origin}/candidat/${encodeURIComponent(candidateId)}?${SHARE_QUERY_PARAM}=${SHARE_QUERY_VALUE}`
}

export function buildShareText(fullName: string): string {
  return `Vote pour ${fullName} aux Awards des Couturier·e·s du Mono 🧵✨`
}

export function buildShareMessage(fullName: string, shareUrl: string): string {
  return `${buildShareText(fullName)} ${shareUrl}`
}

export function buildWhatsAppShareUrl(message: string): string {
  return `${WHATSAPP_SHARE_BASE_URL}${encodeURIComponent(message)}`
}

export function buildFacebookShareUrl(shareUrl: string): string {
  return `${FACEBOOK_SHARE_BASE_URL}${encodeURIComponent(shareUrl)}`
}

export function shouldAutoOpenVote(query: Record<string, unknown>): boolean {
  return query[SHARE_QUERY_PARAM] === SHARE_QUERY_VALUE
}
