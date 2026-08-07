import { describe, it, expect } from 'vitest'
import { VOTE_DEADLINE, timeRemaining, isVotingClosed } from '../../src/utils/countdown'

const at = (iso: string) => new Date(iso)

describe('timeRemaining', () => {
  it('décompose la durée restante en jours, heures, minutes, secondes', () => {
    // 7 j 4 h 12 min 25 s avant la clôture, comme la maquette.
    const now = at('2026-08-07T18:47:34+01:00')
    expect(timeRemaining(now)).toEqual({
      days: 7,
      hours: 5,
      minutes: 12,
      seconds: 25,
      expired: false,
    })
  })

  it('tombe à zéro exactement à la seconde de clôture', () => {
    expect(timeRemaining(at('2026-08-14T23:59:59+01:00'))).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    })
  })

  it('reste à zéro après la clôture, sans jamais produire de valeur négative', () => {
    const result = timeRemaining(at('2026-09-01T12:00:00+01:00'))
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
  })

  it('compte une seconde restante à une seconde de la fin', () => {
    const result = timeRemaining(at('2026-08-14T23:59:58+01:00'))
    expect(result.expired).toBe(false)
    expect(result.seconds).toBe(1)
    expect(result.days).toBe(0)
  })

  it("n'est pas affecté par le fuseau de la machine : la clôture est en heure du Bénin", () => {
    // Même instant, exprimé en UTC : 22:59:59 UTC = 23:59:59 UTC+1.
    expect(timeRemaining(at('2026-08-14T22:59:59Z')).expired).toBe(true)
    expect(timeRemaining(at('2026-08-14T22:59:58Z')).expired).toBe(false)
  })
})

describe('isVotingClosed', () => {
  it('est faux avant la clôture et vrai après', () => {
    expect(isVotingClosed(at('2026-08-14T23:59:58+01:00'))).toBe(false)
    expect(isVotingClosed(at('2026-08-15T00:00:00+01:00'))).toBe(true)
  })
})

describe('VOTE_DEADLINE', () => {
  it('est le 14 août 2026 à 23h59:59 heure du Bénin', () => {
    expect(VOTE_DEADLINE.toISOString()).toBe('2026-08-14T22:59:59.000Z')
  })
})
