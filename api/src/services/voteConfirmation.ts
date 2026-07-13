// Confirmation / rejet d'un vote après retour de paiement SebPay.
// Point d'entrée unique partagé par le webhook et le polling de statut :
// idempotent, transactionnel, le compteur candidat ne s'incrémente qu'une fois.
import type { Db } from '../types'

const TERMINAL_STATUSES = ['confirmed', 'rejected'] as const

interface VoteRow {
  receipt_code: string
  candidate_id: string
  quantity: number
  payment_status: string
  votes_before: number
  votes_after: number
}

export interface VoteConfirmationResult {
  status: string
  alreadyProcessed?: boolean
  votesAfter?: number
}

type Tx = Parameters<Parameters<Db['begin']>[1]>[0]

async function loadVoteForUpdate(tx: Tx, receiptCode: string): Promise<VoteRow | null> {
  const rows = await tx<VoteRow[]>`
    SELECT receipt_code, candidate_id, quantity, payment_status, votes_before, votes_after
    FROM votes
    WHERE receipt_code = ${receiptCode}
    FOR UPDATE`
  return rows[0] ?? null
}

function isTerminal(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status)
}

export async function confirmVote(
  db: Db,
  receiptCode: string,
  transactionId: string | null,
): Promise<VoteConfirmationResult> {
  return db.begin(async (tx): Promise<VoteConfirmationResult> => {
    const vote = await loadVoteForUpdate(tx, receiptCode)
    if (!vote) return { status: 'not_found' }
    if (isTerminal(vote.payment_status)) {
      return { status: vote.payment_status, alreadyProcessed: true }
    }

    const candidateRows = await tx<{ vote_count: number }[]>`
      SELECT vote_count FROM candidates WHERE id = ${vote.candidate_id} FOR UPDATE`
    const votesBefore = candidateRows[0]?.vote_count ?? vote.votes_before
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
  }) as Promise<VoteConfirmationResult>
}

export async function rejectVote(db: Db, receiptCode: string): Promise<VoteConfirmationResult> {
  return db.begin(async (tx): Promise<VoteConfirmationResult> => {
    const vote = await loadVoteForUpdate(tx, receiptCode)
    if (!vote) return { status: 'not_found' }
    if (isTerminal(vote.payment_status)) {
      return { status: vote.payment_status, alreadyProcessed: true }
    }

    await tx`UPDATE votes SET payment_status = ${'rejected'} WHERE receipt_code = ${receiptCode}`
    return { status: 'rejected' }
  }) as Promise<VoteConfirmationResult>
}
