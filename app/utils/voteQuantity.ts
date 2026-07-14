export const MIN_VOTE_QUANTITY = 1
export const MAX_VOTE_QUANTITY = 999

export function clampVoteQuantity(value: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || Number.isNaN(parsed)) return MIN_VOTE_QUANTITY
  return Math.min(MAX_VOTE_QUANTITY, Math.max(MIN_VOTE_QUANTITY, Math.trunc(parsed)))
}

export function formatVoteTotal(quantity: number, unitPrice: number): string {
  return new Intl.NumberFormat('fr-FR').format(clampVoteQuantity(quantity) * unitPrice)
}
