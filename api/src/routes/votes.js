import { Hono } from 'hono'
import { sendError, ERRORS } from '../lib/errors.js'
import { isUuid } from './candidates.js'
import { verifyWebhookSignature } from '../lib/sebpay.js'
import { confirmVote, rejectVote } from '../services/voteConfirmation.js'

const MAX_QUANTITY_PER_VOTE = 1000000
const DEFAULT_COUNTRY = 'BJ'
const PAYMENT_ERROR = { status: 502, code: 'payment_error', message: 'Le paiement a échoué' }

function generateReceiptCode() {
  return `AWAC-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

// SebPay attend un numéro international sans le « + ».
function normalizePhone(phone) {
  return phone.replace(/[^0-9]/g, '')
}

const router = new Hono()

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
  if (candidateRows.length === 0) return sendError(c, ERRORS.NOT_FOUND, 'Candidat introuvable')
  const voteCount = candidateRows[0].vote_count

  const settingsRows = await db`SELECT vote_unit_price, currency FROM settings WHERE id = 1`
  const { vote_unit_price: unitPrice, currency } = settingsRows[0]
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
      return sendError(c, PAYMENT_ERROR, err.message)
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
    id: inserted[0].id,
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
  if (rows.length === 0) return sendError(c, ERRORS.NOT_FOUND, 'Vote introuvable')

  let { payment_status: paymentStatus, votes_after: votesAfter } = rows[0]

  if (paymentStatus === 'pending' && sebpay) {
    try {
      const collection = await sebpay.getCollection(rows[0].receipt_code)
      if (collection.status === 'approved') {
        const result = await confirmVote(db, rows[0].receipt_code, collection.transaction_id)
        paymentStatus = result.status === 'not_found' ? paymentStatus : 'confirmed'
        votesAfter = result.votesAfter ?? votesAfter
      } else if (collection.status === 'rejected') {
        await rejectVote(db, rows[0].receipt_code)
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
