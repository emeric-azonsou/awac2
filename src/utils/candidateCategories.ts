export type CategoryKey = 'homme' | 'femme'

export interface CandidateCategory {
  key: CategoryKey
  label: string
  labelPerson: string
}

export const CATEGORIES: readonly CandidateCategory[] = [
  { key: 'homme', label: 'Hommes', labelPerson: 'Homme' },
  { key: 'femme', label: 'Femmes', labelPerson: 'Femme' },
]

function findCategory(categoryKey: unknown): CandidateCategory | undefined {
  return CATEGORIES.find((category) => category.key === categoryKey)
}

export function filterByCategory<T extends { category?: string | null }>(
  items: T[],
  categoryKey: string,
): T[] {
  if (!findCategory(categoryKey)) return []
  return items.filter((item) => item.category === categoryKey)
}

export function getCategoryLabel(categoryKey: unknown): string {
  return findCategory(categoryKey)?.label ?? ''
}

export function getCategoryPersonLabel(categoryKey: unknown): string {
  return findCategory(categoryKey)?.labelPerson ?? ''
}
