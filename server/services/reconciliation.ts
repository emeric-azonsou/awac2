import type { Db, SebpayClient } from '../types'
import type { LateConfirmationNotifier } from '../lib/notifier'
import { reconcilePendingVote } from './votes'
const DEFAULT_OLDER_THAN_MINUTES = 5
const DEFAULT_BATCH_LIMIT = 50
export interface ReconciliationDeps {
  db: Db
  sebpay: SebpayClient | null
  notifier: LateConfirmationNotifier | null
}
export interface ReconciliationOptions {
  olderThanMinutes?: number
  limit?: number
}
export interface ReconciliationSummary {
  checked: number
  confirmed: number
  rejected: number
  stillPending: number
  errors: number
}
export async function reconcilePendingVotes(
  deps: ReconciliationDeps,
  {
    olderThanMinutes = DEFAULT_OLDER_THAN_MINUTES,
    limit = DEFAULT_BATCH_LIMIT,
  }: ReconciliationOptions,
): Promise<ReconciliationSummary> {
  const { db, sebpay, notifier } = deps
  const summary: ReconciliationSummary = {
    checked: 0,
    confirmed: 0,
    rejected: 0,
    stillPending: 0,
    errors: 0,
  }
  if (!sebpay) return summary
  const staleVotes = await db`
    SELECT v.receipt_code, v.quantity, v.total_amount, v.currency, v.voter_phone,
           c.full_name AS candidate_name
    FROM votes v
    JOIN candidates c ON c.id = v.candidate_id
    WHERE v.payment_status = 'pending'
      AND v.created_at < now() - (${olderThanMinutes} * interval '1 minute')
    ORDER BY v.created_at
    LIMIT ${limit}`
  for (const vote of staleVotes) {
    summary.checked += 1
    try {
      const reconciled = await reconcilePendingVote(db, sebpay, vote.receipt_code)
      if (reconciled.paymentStatus === 'confirmed') {
        summary.confirmed += 1
        if (notifier) {
          try {
            await notifier.voteConfirmedLate({
              receiptCode: vote.receipt_code,
              voterPhone: vote.voter_phone,
              candidateName: vote.candidate_name,
              quantity: vote.quantity,
              amount: Number(vote.total_amount),
              currency: vote.currency,
            })
          } catch {}
        }
      } else if (reconciled.paymentStatus === 'rejected') {
        summary.rejected += 1
      } else {
        summary.stillPending += 1
      }
    } catch {
      summary.errors += 1
    }
  }
  return summary
}
