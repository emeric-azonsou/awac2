import { describe, expect, it } from 'vitest'
import {
  CATEGORIES,
  filterByCategory,
  getCategoryLabel,
  getCategoryPersonLabel,
} from '../../src/utils/candidateCategories'

describe('CATEGORIES', () => {
  it('expose homme puis femme avec les labels exacts', () => {
    expect(CATEGORIES.map((c) => c.key)).toEqual(['homme', 'femme'])
    expect(CATEGORIES.map((c) => c.label)).toEqual(['Hommes', 'Femmes'])
    expect(CATEGORIES.map((c) => c.labelPerson)).toEqual(['Homme', 'Femme'])
  })
})

describe('filterByCategory', () => {
  const candidates = [
    { id: '1', category: 'homme' },
    { id: '2', category: 'femme' },
    { id: '3', category: 'homme' },
    { id: '4', category: null },
  ]

  it('filtre en conservant l\'ordre recu', () => {
    expect(filterByCategory(candidates, 'homme').map((c) => c.id)).toEqual(['1', '3'])
    expect(filterByCategory(candidates, 'femme').map((c) => c.id)).toEqual(['2'])
  })

  it('categorie inconnue ou absente → []', () => {
    expect(filterByCategory(candidates, 'autre')).toEqual([])
    expect(filterByCategory([], 'homme')).toEqual([])
  })
})

describe('getCategoryLabel / getCategoryPersonLabel', () => {
  it('labels pour les cles connues', () => {
    expect(getCategoryLabel('homme')).toBe('Hommes')
    expect(getCategoryLabel('femme')).toBe('Femmes')
    expect(getCategoryPersonLabel('homme')).toBe('Homme')
    expect(getCategoryPersonLabel('femme')).toBe('Femme')
  })

  it('fallback vide pour valeur inconnue ou null', () => {
    expect(getCategoryLabel('x')).toBe('')
    expect(getCategoryLabel(undefined)).toBe('')
    expect(getCategoryPersonLabel(null)).toBe('')
  })
})
