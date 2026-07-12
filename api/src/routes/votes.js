import { Hono } from 'hono'
import { sendError, ERRORS } from '../lib/errors.js'
import { isUuid } from './candidates.js'

const PAYMENT_PROVIDERS = Object.freeze(['mtn', 'moov', 'celtis', 'demo'])
const MAX_QUANTITY_PER_VOTE = 1000000

function generateReceiptCode() {
  const random = crypto.randomUUID().slice(0, 8).toUpperCase()
  return `AWAC-${Date.now()}-${random}`
}

const router = new Hono()

router.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const candidateId = body.candidate_id
  const quantity = body.quantity
  const provider = body.payment_provider
  const voterPhone = typeof body.voter_phone === 'string' ? body.voter_phone.trim() : ''

  if (!isUuid(candidateId)) return sendError(c, ERRORS.VALIDATION, 'candidate_id invalide')
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return sendError(c, ERRORS.VALIDATION, 'La quantité doit être un entier positif')
  }
  if (quantity > MAX_QUANTITY_PER_VOTE) {
    return sendError(c, ERRORS.VALIDATION, `Quantité maximale par transaction : ${MAX_QUANTITY_PER_VOTE}`)
  }
  if (!PAYMENT_PROVIDERS.includes(provider)) {
    return sendError(c, ERRORS.VALIDATION, 'Opérateur de paiement invalide')
  }
  if (!voterPhone) return sendError(c, ERRORS.VALIDATION, 'Numéro de téléphone requis')

  const db = c.get('db')
  const settingsRows = await db`SELECT vote_unit_price, currency FROM settings WHERE id = 1`
  const { vote_unit_price: unitPrice, currency } = settingsRows[0]
  const totalAmount = Number(unitPrice) * quantity
  const receiptCode = generateReceiptCode()

  const created = await db.begin(async (tx) => {
    const candidateRows = await tx`
      SELECT id, vote_count FROM candidates WHERE id = ${candidateId} FOR UPDATE`
    if (candidateRows.length === 0) return null

    const votesBefore = candidateRows[0].vote_count
    const votesAfter = votesBefore + quantity

    const rows = await tx`
      INSERT INTO votes (candidate_id, quantity, unit_price, total_amount, currency,
                         voter_phone, receipt_code, votes_before, votes_after,
                         payment_provider, payment_status)
      VALUES (${candidateId}, ${quantity}, ${unitPrice}, ${totalAmount}, ${currency},
              ${voterPhone}, ${receiptCode}, ${votesBefore}, ${votesAfter},
              ${provider}, 'simulated')
      RETURNING id, quantity, total_amount, currency, payment_status, receipt_code, votes_after`

    await tx`UPDATE candidates SET vote_count = ${votesAfter}, updated_at = now() WHERE id = ${candidateId}`
    return rows[0]
  })

  if (!created) return sendError(c, ERRORS.NOT_FOUND, 'Candidat introuvable')
  return c.json(created, 201)
})

export default router
