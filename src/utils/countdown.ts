// Clôture des votes : mercredi 19 août 2026 à 23h59:59, heure du Bénin (UTC+1,
// pas de changement d'heure). L'instant est figé en UTC pour que le décompte
// soit le même partout : un votant en France ne doit pas voir une heure de plus
// que la clôture réelle.
export const VOTE_DEADLINE = new Date('2026-08-19T23:59:59+01:00')

export interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const EXPIRED: TimeRemaining = { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }

export function timeRemaining(now: Date = new Date()): TimeRemaining {
  const left = VOTE_DEADLINE.getTime() - now.getTime()
  // À la seconde de clôture et après, tout est à zéro : jamais de négatif à
  // l'écran, qui donnerait un décompte absurde.
  if (left <= 0) return EXPIRED
  return {
    days: Math.floor(left / DAY),
    hours: Math.floor((left % DAY) / HOUR),
    minutes: Math.floor((left % HOUR) / MINUTE),
    seconds: Math.floor((left % MINUTE) / SECOND),
    expired: false,
  }
}

export function isVotingClosed(now: Date = new Date()): boolean {
  return timeRemaining(now).expired
}
