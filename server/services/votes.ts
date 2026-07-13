import type { Db, SebpayClient, PaymentConfig } from '../types'
import { ok, fail, ERRORS, type HttpResult, type ErrorEntry } from '../lib/errors'
import { isUuid } from './candidates'
import { verifyWebhookSignature } from '../lib/sebpay'
import { confirmVote, rejectVote } from './voteConfirmation'

const MAX_QUANTITY_PER_VOTE = 1000000
const DEFAULT_COUNTRY = 'BJ'
const PAYMENT_ERROR: ErrorEntry = { status: 502, code: 'payment_error', message: 'Le paiement a échoué' }

export interface VoteDeps {
  db: Db
  sebpay: SebpayClient | null
  config: PaymentConfig
}
export interface VoteStatusDeps {
  db: Db
  sebpay: SebpayClient | null
}
export interface WebhookDeps {
  db: Db
  secret: string
}

function generateReceiptCode(): string {
  return `AWAC-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

// SebPay attend un numéro international sans le « + ».
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

export async function submitVote(deps: VoteDeps, body: unknown): Promise<HttpResult> {
  const input = (body ?? {}) as Record<string, unknown>
  const candidateId = input.candidate_id
  const quantity = input.quantity
  const operator = typeof input.operator === 'string' ? input.operator.trim() : ''
  const voterPhone = typeof input.voter_phone === 'string' ? input.voter_phone.trim() : ''
  const country = typeof input.country === 'string' && input.country ? input.country : DEFAULT_COUNTRY

  if (!isUuid(candidateId)) return fail(ERRORS.VALIDATION, 'candidate_id invalide')
  if (!Number.isInteger(quantity) || (quantity as number) <= 0) {
    return fail(ERRORS.VALIDATION, 'La quantité doit être un entier positif')
  }
  if ((quantity as number) > MAX_QUANTITY_PER_VOTE) {
    return fail(ERRORS.VALIDATION, `Quantité maximale par transaction : ${MAX_QUANTITY_PER_VOTE}`)
  }
  if (!operator) return fail(ERRORS.VALIDATION, 'Opérateur requis')
  if (!voterPhone) return fail(ERRORS.VALIDATION, 'Numéro de téléphone requis')

  const { db, sebpay, config } = deps
  const quantityNum = quantity as number

  const candidateRows = await db`SELECT id, vote_count FROM candidates WHERE id = ${candidateId}`
  const candidate = candidateRows[0]
  if (!candidate) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')
  const voteCount = candidate.vote_count

  const settingsRows = await db`SELECT vote_unit_price, currency FROM settings WHERE id = 1`
  const settings = settingsRows[0]
  if (!settings) return fail(ERRORS.NOT_FOUND, 'Réglages introuvables')
  const { vote_unit_price: unitPrice, currency: defaultCurrency } = settings
  const requestedCurrency = typeof input.currency === 'string' ? input.currency.trim().toUpperCase() : ''
  const currency = /^[A-Z]{3}$/.test(requestedCurrency) ? requestedCurrency : defaultCurrency
  const totalAmount = Number(unitPrice) * quantityNum
  const receiptCode = generateReceiptCode()

  let transactionId: string | null = null
  let providerLink: string | null = null
  const simulated = !sebpay

  if (sebpay) {
    try {
      const collection = await sebpay.createCollection({
        amount: totalAmount,
        currency,
        phone: normalizePhone(voterPhone),
        operator,
        country,
        externalReference: receiptCode,
        callbackUrl: config.callbackUrl,
      })
      transactionId = collection.transaction_id ?? null
      providerLink = collection.provider_link ?? null
    } catch (err) {
      return fail(PAYMENT_ERROR, err instanceof Error ? err.message : undefined)
    }
  }

  const inserted = await db`
    INSERT INTO votes (candidate_id, quantity, unit_price, total_amount, currency,
                       voter_phone, receipt_code, votes_before, votes_after,
                       payment_provider, payment_status, payment_reference)
    VALUES (${candidateId}, ${quantityNum}, ${unitPrice}, ${totalAmount}, ${currency},
            ${voterPhone}, ${receiptCode}, ${voteCount}, ${voteCount},
            ${operator}, 'pending', ${transactionId})
    RETURNING id, receipt_code`

  let paymentStatus = 'pending'
  if (simulated) {
    await confirmVote(db, receiptCode, null)
    paymentStatus = 'confirmed'
  }

  return ok({
    id: inserted[0]?.id,
    receipt_code: receiptCode,
    payment_status: paymentStatus,
    provider_link: providerLink,
    amount: totalAmount,
    currency,
  }, 201)
}

export async function getVoteStatus(deps: VoteStatusDeps, id: string): Promise<HttpResult> {
  if (!isUuid(id)) return fail(ERRORS.NOT_FOUND, 'Vote introuvable')
  const { db, sebpay } = deps
  const rows = await db`SELECT id, receipt_code, payment_status, votes_after FROM votes WHERE id = ${id}`
  const vote = rows[0]
  if (!vote) return fail(ERRORS.NOT_FOUND, 'Vote introuvable')

  let { payment_status: paymentStatus, votes_after: votesAfter } = vote

  if (paymentStatus === 'pending' && sebpay) {
    try {
      const collection = await sebpay.getCollection(vote.receipt_code)
      if (collection.status === 'approved') {
        const result = await confirmVote(db, vote.receipt_code, collection.transaction_id)
        paymentStatus = result.status === 'not_found' ? paymentStatus : 'confirmed'
        votesAfter = result.votesAfter ?? votesAfter
      } else if (collection.status === 'rejected') {
        await rejectVote(db, vote.receipt_code)
        paymentStatus = 'rejected'
      }
    } catch {
      // Erreur transitoire SebPay : on garde pending, le prochain sondage réessaiera.
    }
  }

  return ok({ id, payment_status: paymentStatus, votes_after: votesAfter })
}

export async function processWebhook(deps: WebhookDeps, rawBody: string, signature: string | null): Promise<HttpResult> {
  const { db, secret } = deps
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return fail(ERRORS.UNAUTHORIZED, 'Signature invalide')
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return fail(ERRORS.VALIDATION, 'Corps invalide')
  }

  const reference = payload.external_reference
  if (typeof reference === 'string' && reference) {
    if (payload.status === 'approved') await confirmVote(db, reference, (payload.transaction_id as string) ?? null)
    else if (payload.status === 'rejected') await rejectVote(db, reference)
  }

  return ok({ received: true })
}
