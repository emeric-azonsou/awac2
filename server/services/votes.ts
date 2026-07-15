import type { Db, FeexpayClient } from '../types'
import { ok, fail, ERRORS, type HttpResult, type ErrorEntry } from '../lib/errors'
import { isUuid } from './candidates'
import { verifyWebhookToken, toFeexpayPhone } from '../lib/feexpay'
import { getNetworkSlugs } from './payment'
import { confirmVote, rejectVote } from './voteConfirmation'
const MAX_QUANTITY_PER_VOTE = 999
const MAX_PENDING_PER_PHONE = 5
const PENDING_PHONE_WINDOW_MINUTES = 30
const PAYMENT_ERROR: ErrorEntry = {
  status: 502,
  code: 'payment_error',
  message: 'Le paiement a échoué',
}
const RATE_LIMITED: ErrorEntry = {
  status: 429,
  code: 'too_many_pending',
  message: 'Trop de demandes de paiement en attente pour ce numéro, réessayez plus tard',
}
const SIMULATED_IN_PRODUCTION: ErrorEntry = {
  status: 503,
  code: 'payment_unavailable',
  message: 'Le paiement est momentanément indisponible',
}
export interface VoteDeps {
  db: Db
  feexpay: FeexpayClient | null
}
export interface VoteStatusDeps {
  db: Db
  feexpay: FeexpayClient | null
}
export interface WebhookDeps {
  db: Db
  feexpay: FeexpayClient | null
  secret: string
}
function generateReceiptCode(): string {
  return `AWAC-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}
export async function submitVote(deps: VoteDeps, body: unknown): Promise<HttpResult> {
  const input = (body ?? {}) as Record<string, unknown>
  const candidateId = input.candidate_id
  const quantity = input.quantity
  const operator = typeof input.operator === 'string' ? input.operator.trim() : ''
  const voterPhone = typeof input.voter_phone === 'string' ? input.voter_phone.trim() : ''
  if (!isUuid(candidateId)) return fail(ERRORS.VALIDATION, 'candidate_id invalide')
  if (!Number.isInteger(quantity) || (quantity as number) <= 0) {
    return fail(ERRORS.VALIDATION, 'La quantité doit être un entier positif')
  }
  if ((quantity as number) > MAX_QUANTITY_PER_VOTE) {
    return fail(ERRORS.VALIDATION, `Quantité maximale par transaction : ${MAX_QUANTITY_PER_VOTE}`)
  }
  if (!operator) return fail(ERRORS.VALIDATION, 'Opérateur requis')
  if (!voterPhone) return fail(ERRORS.VALIDATION, 'Numéro de téléphone requis')
  const { db, feexpay } = deps
  const simulated = !feexpay
  if (simulated && process.env.NODE_ENV === 'production') {
    return fail(SIMULATED_IN_PRODUCTION)
  }
  if (feexpay && !getNetworkSlugs().includes(operator)) {
    return fail(ERRORS.VALIDATION, 'Opérateur non pris en charge')
  }
  const quantityNum = quantity as number
  const normalizedPhone = normalizePhone(voterPhone)
  const pendingRows = await db`
    SELECT COUNT(*)::int AS pending
    FROM votes
    WHERE voter_phone = ${normalizedPhone}
      AND payment_status = 'pending'
      AND created_at > now() - (${PENDING_PHONE_WINDOW_MINUTES} * interval '1 minute')`
  if (Number(pendingRows[0]?.pending) >= MAX_PENDING_PER_PHONE) {
    return fail(RATE_LIMITED)
  }
  const candidateRows =
    await db`SELECT id, vote_count FROM candidates WHERE id = ${candidateId} AND deleted_at IS NULL`
  const candidate = candidateRows[0]
  if (!candidate) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')
  const voteCount = candidate.vote_count
  const settingsRows = await db`SELECT vote_unit_price, currency FROM settings WHERE id = 1`
  const settings = settingsRows[0]
  if (!settings) return fail(ERRORS.NOT_FOUND, 'Réglages introuvables')

  const { vote_unit_price: unitPrice, currency } = settings
  const totalAmount = Number(unitPrice) * quantityNum
  const receiptCode = generateReceiptCode()

  const inserted = await db`
    INSERT INTO votes (candidate_id, quantity, unit_price, total_amount, currency,
                       voter_phone, receipt_code, votes_before, votes_after,
                       payment_provider, payment_status, payment_reference)
    VALUES (${candidateId}, ${quantityNum}, ${unitPrice}, ${totalAmount}, ${currency},
            ${normalizedPhone}, ${receiptCode}, ${voteCount}, ${voteCount},
            ${operator}, 'pending', ${null})
    RETURNING id, receipt_code`
  if (feexpay) {
    try {
      const payment = await feexpay.initPayment({
        amount: totalAmount,
        network: operator,
        phoneNumber: toFeexpayPhone(normalizedPhone),
        callbackInfo: receiptCode,
      })
      await db`UPDATE votes SET payment_reference = ${payment.reference} WHERE receipt_code = ${receiptCode}`
    } catch (err) {
      await rejectVote(db, receiptCode)
      return fail(PAYMENT_ERROR, err instanceof Error ? err.message : undefined)
    }
  }
  let paymentStatus = 'pending'
  let votesAfter: number | null = null
  if (simulated) {
    const confirmation = await confirmVote(db, receiptCode, null)
    paymentStatus = 'confirmed'
    votesAfter = confirmation.votesAfter ?? null
  }
  return ok(
    {
      id: inserted[0]?.id,
      receipt_code: receiptCode,
      payment_status: paymentStatus,
      amount: totalAmount,
      currency,
      votes_after: votesAfter,
    },
    201,
  )
}
export interface ReconcileResult {
  paymentStatus: 'confirmed' | 'rejected' | 'pending'
  votesAfter: number | null
}
export interface PendingVoteRef {
  receiptCode: string
  paymentReference: string | null
  expectedAmount: number
}
export async function reconcilePendingVote(
  db: Db,
  feexpay: FeexpayClient,
  vote: PendingVoteRef,
): Promise<ReconcileResult> {
  if (!vote.paymentReference) return { paymentStatus: 'pending', votesAfter: null }
  const payment = await feexpay.getPaymentStatus(vote.paymentReference)
  const status = String(payment.status || '').toUpperCase()
  if (status === 'SUCCESSFUL') {
    const paidAmount = payment.amount === undefined ? null : Number(payment.amount)
    if (paidAmount !== null && paidAmount !== Number(vote.expectedAmount)) {
      return { paymentStatus: 'pending', votesAfter: null }
    }
    const result = await confirmVote(db, vote.receiptCode, vote.paymentReference)
    return {
      paymentStatus: result.status === 'not_found' ? 'pending' : 'confirmed',
      votesAfter: result.votesAfter ?? null,
    }
  }
  if (status === 'FAILED') {
    await rejectVote(db, vote.receiptCode)
    return { paymentStatus: 'rejected', votesAfter: null }
  }
  return { paymentStatus: 'pending', votesAfter: null }
}
export async function getVoteStatus(deps: VoteStatusDeps, id: string): Promise<HttpResult> {
  if (!isUuid(id)) return fail(ERRORS.NOT_FOUND, 'Vote introuvable')
  const { db, feexpay } = deps
  const rows = await db`
    SELECT id, receipt_code, payment_status, payment_reference, total_amount, votes_after
    FROM votes WHERE id = ${id}`
  const vote = rows[0]
  if (!vote) return fail(ERRORS.NOT_FOUND, 'Vote introuvable')
  let { payment_status: paymentStatus, votes_after: votesAfter } = vote
  if (paymentStatus === 'pending' && feexpay) {
    try {
      const reconciled = await reconcilePendingVote(db, feexpay, {
        receiptCode: vote.receipt_code,
        paymentReference: vote.payment_reference,
        expectedAmount: Number(vote.total_amount),
      })
      if (reconciled.paymentStatus !== 'pending') paymentStatus = reconciled.paymentStatus
      votesAfter = reconciled.votesAfter ?? votesAfter
    } catch {}
  }
  return ok({ id, payment_status: paymentStatus, votes_after: votesAfter })
}
export async function processWebhook(
  deps: WebhookDeps,
  rawBody: string,
  token: string | null,
): Promise<HttpResult> {
  const { db, feexpay, secret } = deps
  if (!verifyWebhookToken(token, secret)) {
    return fail(ERRORS.UNAUTHORIZED, 'Jeton invalide')
  }
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return fail(ERRORS.VALIDATION, 'Corps invalide')
  }
  const reference = payload.reference
  if (feexpay && typeof reference === 'string' && reference) {
    const rows = await db`
      SELECT receipt_code, payment_status, total_amount
      FROM votes WHERE payment_reference = ${reference}`
    const vote = rows[0]
    if (vote && vote.payment_status === 'pending') {
      try {
        await reconcilePendingVote(db, feexpay, {
          receiptCode: vote.receipt_code,
          paymentReference: reference,
          expectedAmount: Number(vote.total_amount),
        })
      } catch {}
    }
  }
  return ok({ received: true })
}
