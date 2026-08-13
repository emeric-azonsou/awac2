import type { Db } from '../types'
import { ok, type HttpResult } from '../lib/errors'
import { isVoteDeadlineReached } from '../../shared/voteDeadline'

export async function getPublicSettings(
  db: Db,
  now: () => Date = () => new Date(),
): Promise<HttpResult> {
  const rows = await db`SELECT vote_unit_price, currency FROM settings WHERE id = 1`
  const row = rows[0] ?? { vote_unit_price: null, currency: null }
  const serverTime = now()
  return ok({
    vote_unit_price: row.vote_unit_price,
    currency: row.currency,
    server_time: serverTime.toISOString(),
    voting_closed: isVoteDeadlineReached(serverTime),
  })
}
