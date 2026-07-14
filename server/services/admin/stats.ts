import type { Db } from '../../types'
import { ok, type HttpResult } from '../../lib/errors'
const TOP_CANDIDATES_LIMIT = 5
const PAYMENT_STATUSES = ['confirmed', 'pending', 'rejected'] as const
export interface AdminStatsDeps {
  db: Db
}
interface StatusAggregate {
  count: number
  amount: number
}
export async function getAdminStats(deps: AdminStatsDeps): Promise<HttpResult> {
  const { db } = deps
  const statusRows = await db`
    SELECT payment_status,
           COUNT(*)::int AS votes_count,
           COALESCE(SUM(quantity), 0)::int AS voices_total,
           COALESCE(SUM(total_amount), 0)::int AS amount_total
    FROM votes
    GROUP BY payment_status`
  const votesByStatus: Record<string, StatusAggregate> = {}
  for (const status of PAYMENT_STATUSES) {
    votesByStatus[status] = { count: 0, amount: 0 }
  }
  let voicesConfirmed = 0
  for (const row of statusRows) {
    const status = String(row.payment_status)
    votesByStatus[status] = {
      count: Number(row.votes_count) || 0,
      amount: Number(row.amount_total) || 0,
    }
    if (status === 'confirmed') voicesConfirmed = Number(row.voices_total) || 0
  }
  const candidateCountRows = await db`
    SELECT COUNT(*)::int AS total FROM candidates WHERE deleted_at IS NULL`
  const topRows = await db`
    SELECT id, full_name, vote_count FROM candidates
    WHERE deleted_at IS NULL
    ORDER BY vote_count DESC, full_name ASC
    LIMIT ${TOP_CANDIDATES_LIMIT}`
  return ok({
    revenue_fcfa: votesByStatus.confirmed?.amount ?? 0,
    voices_confirmed: voicesConfirmed,
    candidates_count: Number(candidateCountRows[0]?.total) || 0,
    votes_by_status: votesByStatus,
    top_candidates: topRows.map((row) => ({
      id: String(row.id),
      full_name: String(row.full_name),
      vote_count: Number(row.vote_count) || 0,
    })),
  })
}
