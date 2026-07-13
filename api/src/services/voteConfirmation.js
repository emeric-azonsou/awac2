// Confirmation / rejet d'un vote après retour de paiement SebPay.
// Point d'entrée unique partagé par le webhook et le polling de statut :
// idempotent, transactionnel, le compteur candidat ne s'incrémente qu'une fois.

const TERMINAL_STATUSES = Object.freeze(['confirmed', 'rejected'])

async function loadVoteForUpdate(tx, receiptCode) {
  const rows = await tx`
    SELECT receipt_code, candidate_id, quantity, payment_status, votes_before, votes_after
    FROM votes
    WHERE receipt_code = ${receiptCode}
    FOR UPDATE`
  return rows[0] ?? null
}

export async function confirmVote(db, receiptCode, transactionId) {
  return db.begin(async (tx) => {
    const vote = await loadVoteForUpdate(tx, receiptCode)
    if (!vote) return { status: 'not_found' }
    if (TERMINAL_STATUSES.includes(vote.payment_status)) {
      return { status: vote.payment_status, alreadyProcessed: true }
    }

    const candidateRows = await tx`
      SELECT vote_count FROM candidates WHERE id = ${vote.candidate_id} FOR UPDATE`
    const votesBefore = candidateRows[0].vote_count
    const votesAfter = votesBefore + vote.quantity

    await tx`UPDATE candidates SET vote_count = ${votesAfter}, updated_at = now() WHERE id = ${vote.candidate_id}`
    await tx`
      UPDATE votes
      SET payment_status = ${'confirmed'},
          payment_reference = ${transactionId ?? null},
          votes_before = ${votesBefore},
          votes_after = ${votesAfter}
      WHERE receipt_code = ${receiptCode}`

    return { status: 'confirmed', votesAfter }
  })
}

export async function rejectVote(db, receiptCode) {
  return db.begin(async (tx) => {
    const vote = await loadVoteForUpdate(tx, receiptCode)
    if (!vote) return { status: 'not_found' }
    if (TERMINAL_STATUSES.includes(vote.payment_status)) {
      return { status: vote.payment_status, alreadyProcessed: true }
    }

    await tx`UPDATE votes SET payment_status = ${'rejected'} WHERE receipt_code = ${receiptCode}`
    return { status: 'rejected' }
  })
}
