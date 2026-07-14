const STORAGE_KEY = 'awac_pending_votes'
const MAX_TRACKED_VOTES = 20
export interface PendingVoteEntry {
  receipt_code: string
  candidate_name: string
}
function defaultStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}
export function listPendingVotes(storage: Storage | null = defaultStorage()): PendingVoteEntry[] {
  if (!storage) return []
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is PendingVoteEntry =>
        typeof item?.receipt_code === 'string' && typeof item?.candidate_name === 'string',
    )
  } catch {
    return []
  }
}
export function rememberPendingVote(
  entry: PendingVoteEntry,
  storage: Storage | null = defaultStorage(),
): void {
  if (!storage) return
  try {
    const existing = listPendingVotes(storage).filter(
      (item) => item.receipt_code !== entry.receipt_code,
    )
    const next = [...existing, entry].slice(-MAX_TRACKED_VOTES)
    storage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {}
}
export function forgetPendingVote(
  receiptCode: string,
  storage: Storage | null = defaultStorage(),
): void {
  if (!storage) return
  try {
    const next = listPendingVotes(storage).filter((item) => item.receipt_code !== receiptCode)
    storage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {}
}
