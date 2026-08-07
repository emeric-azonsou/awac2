import { voteService } from '../utils/voteService'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 2 * 60 * 1000

export type PollOutcome =
  | { status: 'confirmed'; votesAfter: number }
  | { status: 'rejected' }
  | { status: 'timeout' }

interface PollOptions {
  intervalMs?: number
  timeoutMs?: number
}

// Logique indépendante de tout framework : reprise telle quelle de Vue, seuls
// les types sont ajoutés. Le polling s'arrête sur confirmed, rejected, ou au
// bout de deux minutes ; une erreur réseau est ignorée et retentée.
export function pollPaymentStatus(
  voteId: string,
  { intervalMs = POLL_INTERVAL_MS, timeoutMs = POLL_TIMEOUT_MS }: PollOptions = {},
) {
  const deadline = Date.now() + timeoutMs
  let timer: ReturnType<typeof setTimeout> | null = null
  let cancelled = false

  const promise = new Promise<PollOutcome>((resolve) => {
    const tick = async () => {
      if (cancelled) return
      try {
        const { payment_status: status, votes_after: votesAfter } =
          await voteService.getVoteStatus(voteId)
        if (status === 'confirmed') return resolve({ status: 'confirmed', votesAfter })
        if (status === 'rejected') return resolve({ status: 'rejected' })
      } catch {
        // Erreur réseau transitoire : on retente au prochain tick.
      }
      if (Date.now() >= deadline) return resolve({ status: 'timeout' })
      timer = setTimeout(tick, intervalMs)
    }
    void tick()
  })

  const cancel = () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }

  return { promise, cancel }
}
