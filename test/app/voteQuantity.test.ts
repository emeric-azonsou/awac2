import { describe, expect, it } from 'vitest'
import {
  MAX_VOTE_QUANTITY,
  MIN_VOTE_QUANTITY,
  clampVoteQuantity,
  formatVoteTotal,
} from '../../app/utils/voteQuantity'

describe('clampVoteQuantity', () => {
  it('garde une quantité valide telle quelle', () => {
    expect(clampVoteQuantity(5)).toBe(5)
  })

  it('remonte les valeurs sous le minimum au minimum', () => {
    expect(clampVoteQuantity(0)).toBe(MIN_VOTE_QUANTITY)
    expect(clampVoteQuantity(-3)).toBe(MIN_VOTE_QUANTITY)
  })

  it('plafonne les valeurs au maximum', () => {
    expect(clampVoteQuantity(MAX_VOTE_QUANTITY + 50)).toBe(MAX_VOTE_QUANTITY)
  })

  it('tronque les décimales', () => {
    expect(clampVoteQuantity(2.9)).toBe(2)
  })

  it('retombe au minimum pour toute entrée non numérique', () => {
    expect(clampVoteQuantity(Number.NaN)).toBe(MIN_VOTE_QUANTITY)
    expect(clampVoteQuantity('abc' as unknown as number)).toBe(MIN_VOTE_QUANTITY)
    expect(clampVoteQuantity(undefined as unknown as number)).toBe(MIN_VOTE_QUANTITY)
    expect(clampVoteQuantity(Number.POSITIVE_INFINITY)).toBe(MAX_VOTE_QUANTITY)
  })

  it('accepte les chaînes numériques saisies dans un input', () => {
    expect(clampVoteQuantity('12' as unknown as number)).toBe(12)
  })
})

describe('formatVoteTotal', () => {
  it('calcule et formate le total en groupes fr-FR', () => {
    expect(formatVoteTotal(25, 100)).toBe('2 500')
  })

  it('retombe au minimum de voix pour une quantité invalide', () => {
    expect(formatVoteTotal(Number.NaN, 100)).toBe('100')
  })
})
