export const VOTE_DEADLINE_ISO = '2026-08-14T23:59:59+01:00'
export const VOTE_DEADLINE_MS = Date.parse(VOTE_DEADLINE_ISO)

export function isVoteDeadlineReached(now: Date = new Date()): boolean {
  return now.getTime() >= VOTE_DEADLINE_MS
}
