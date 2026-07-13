import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sendError, ERRORS, type ErrorEntry } from '../lib/errors.ts'
import { isUuid } from './candidates.ts'
import { verifyWebhookSignature } from '../lib/sebpay.ts'
import { confirmVote, rejectVote } from '../services/voteConfirmation.ts'

const MAX_QUANTITY_PER_VOTE = 1000000
const DEFAULT_COUNTRY = 'BJ'
const PAYMENT_ERROR: ErrorEntry = { status: 502, code: 'payment_error', message: 'Le paiement a échoué' }

function generateReceiptCode() {
  return `AWAC-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

// SebPay attend un numéro international sans le « + ».
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

const router = new Hono<AppEnv>()

router.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const candidateId = body.candidate_id
  const quantity = body.quantity
  const operator = typeof body.operator === 'string' ? body.operator.trim() : ''
  const voterPhone = typeof body.voter_phone === 'string' ? body.voter_phone.trim() : ''
  const country = typeof body.country === 'string' && body.country ? body.country : DEFAULT_COUNTRY

  if (!isUuid(candidateId)) return sendError(c, ERRORS.VALIDATION, 'candidate_id invalide')
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return sendError(c, ERRORS.VALIDATION, 'La quantité doit être un entier positif')
  }
  if (quantity > MAX_QUANTITY_PER_VOTE) {
    return sendError(c, ERRORS.VALIDATION, `Quantité maximale par transaction : ${MAX_QUANTITY_PER_VOTE}`)
  }
  if (!operator) return sendError(c, ERRORS.VALIDATION, 'Opérateur requis')
  if (!voterPhone) return sendError(c, ERRORS.VALIDATION, 'Numéro de téléphone requis')

  const db = c.get('db')
  const sebpay = c.get('sebpay')
  const config = c.get('paymentConfig')

  const candidateRows = await db`SELECT id, vote_count FROM candidates WHERE id = ${candidateId}`
  const candidate = candidateRows[0]
  if (!candidate) return sendError(c, ERRORS.NOT_FOUND, 'Candidat introuvable')
  const voteCount = candidate.vote_count

  const settingsRows = await db`SELECT vote_unit_price, currency FROM settings WHERE id = 1`
  const settings = settingsRows[0]
  if (!settings) return sendError(c, ERRORS.NOT_FOUND, 'Réglages introuvables')
  const { vote_unit_price: unitPrice, currency: defaultCurrency } = settings
  // Devise du pays choisi (SebPay exige la cohérence pays/devise). Repli : devise des réglages.
  const requestedCurrency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : ''
  const currency = /^[A-Z]{3}$/.test(requestedCurrency) ? requestedCurrency : defaultCurrency
  const totalAmount = Number(unitPrice) * quantity
  const receiptCode = generateReceiptCode()

  let transactionId = null
  let providerLink = null
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
      return sendError(c, PAYMENT_ERROR, err instanceof Error ? err.message : undefined)
    }
  }

  const inserted = await db`
    INSERT INTO votes (candidate_id, quantity, unit_price, total_amount, currency,
                       voter_phone, receipt_code, votes_before, votes_after,
                       payment_provider, payment_status, payment_reference)
    VALUES (${candidateId}, ${quantity}, ${unitPrice}, ${totalAmount}, ${currency},
            ${voterPhone}, ${receiptCode}, ${voteCount}, ${voteCount},
            ${operator}, 'pending', ${transactionId})
    RETURNING id, receipt_code`

  let paymentStatus = 'pending'
  if (simulated) {
    await confirmVote(db, receiptCode, null)
    paymentStatus = 'confirmed'
  }

  return c.json({
    id: inserted[0]?.id,
    receipt_code: receiptCode,
    payment_status: paymentStatus,
    provider_link: providerLink,
    amount: totalAmount,
    currency,
  }, 201)
})

router.get('/:id/status', async (c) => {
  const id = c.req.param('id')
  if (!isUuid(id)) return sendError(c, ERRORS.NOT_FOUND, 'Vote introuvable')

  const db = c.get('db')
  const sebpay = c.get('sebpay')
  const rows = await db`SELECT id, receipt_code, payment_status, votes_after FROM votes WHERE id = ${id}`
  const vote = rows[0]
  if (!vote) return sendError(c, ERRORS.NOT_FOUND, 'Vote introuvable')

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

  return c.json({ id, payment_status: paymentStatus, votes_after: votesAfter })
})

router.post('/webhook', async (c) => {
  const rawBody = await c.req.text()
  const signature = c.req.header('X-SebPay-Signature')
  const secret = c.get('sebpaySecret')

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return sendError(c, ERRORS.UNAUTHORIZED, 'Signature invalide')
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return sendError(c, ERRORS.VALIDATION, 'Corps invalide')
  }

  const reference = payload.external_reference
  const db = c.get('db')
  if (reference) {
    if (payload.status === 'approved') await confirmVote(db, reference, payload.transaction_id)
    else if (payload.status === 'rejected') await rejectVote(db, reference)
  }

  return c.json({ received: true })
})

export default router
