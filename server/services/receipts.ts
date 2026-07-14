import type { Db, SebpayClient } from '../types'
import { ok, fail, ERRORS, type HttpResult } from '../lib/errors'
import { reconcilePendingVote } from './votes'
const RECEIPT_CODE_PATTERN = /^AWAC-\d{10,16}-[A-Z0-9]{8}$/
export interface ReceiptDeps {
  db: Db
  sebpay: SebpayClient | null
}
export async function getReceipt(deps: ReceiptDeps, code: string): Promise<HttpResult> {
  if (typeof code !== 'string' || !RECEIPT_CODE_PATTERN.test(code)) {
    return fail(ERRORS.NOT_FOUND, 'Reçu introuvable')
  }
  const { db, sebpay } = deps
  const rows = await db`
    SELECT v.receipt_code, v.payment_status, v.quantity, v.total_amount, v.currency,
           v.created_at, v.votes_before, v.votes_after, c.full_name AS candidate_name
    FROM votes v
    JOIN candidates c ON c.id = v.candidate_id
    WHERE v.receipt_code = ${code}`
  const receipt = rows[0]
  if (!receipt) return fail(ERRORS.NOT_FOUND, 'Reçu introuvable')
  let paymentStatus = receipt.payment_status

  let votesBefore = paymentStatus === 'confirmed' ? receipt.votes_before : null
  let votesAfter = paymentStatus === 'confirmed' ? receipt.votes_after : null
  if (paymentStatus === 'pending' && sebpay) {
    try {
      const reconciled = await reconcilePendingVote(db, sebpay, code)
      if (reconciled.paymentStatus !== 'pending') paymentStatus = reconciled.paymentStatus
      if (reconciled.paymentStatus === 'confirmed' && reconciled.votesAfter !== null) {
        votesAfter = reconciled.votesAfter
        votesBefore = reconciled.votesAfter - receipt.quantity
      }
    } catch {}
  }
  return ok({
    receipt_code: receipt.receipt_code,
    payment_status: paymentStatus,
    quantity: receipt.quantity,
    amount: Number(receipt.total_amount),
    currency: receipt.currency,
    candidate_name: receipt.candidate_name,
    created_at: receipt.created_at,
    votes_before: votesBefore,
    votes_after: votesAfter,
  })
}
