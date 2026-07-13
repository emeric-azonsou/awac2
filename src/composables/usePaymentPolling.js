import { voteService } from '@/services/voteService'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 2 * 60 * 1000

// Sonde le statut d'un vote toutes les 2s jusqu'à 2 min.
// Résout avec 'confirmed' | 'rejected' | 'timeout'. Filet de sécurité en plus du webhook.
export function pollPaymentStatus(voteId, { intervalMs = POLL_INTERVAL_MS, timeoutMs = POLL_TIMEOUT_MS } = {}) {
  const deadline = Date.now() + timeoutMs
  let timer = null
  let cancelled = false

  const promise = new Promise((resolve) => {
    const tick = async () => {
      if (cancelled) return
      try {
        const { payment_status: status, votes_after: votesAfter } = await voteService.getVoteStatus(voteId)
        if (status === 'confirmed') return resolve({ status: 'confirmed', votesAfter })
        if (status === 'rejected') return resolve({ status: 'rejected' })
      } catch {
        // Erreur transitoire : on continue de sonder jusqu'au timeout.
      }
      if (Date.now() >= deadline) return resolve({ status: 'timeout' })
      timer = setTimeout(tick, intervalMs)
    }
    tick()
  })

  const cancel = () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }

  return { promise, cancel }
}
