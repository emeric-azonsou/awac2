import type { Db } from '../types'
import { ok, type HttpResult } from '../lib/errors'

export async function getPublicSettings(db: Db): Promise<HttpResult> {
  const rows = await db`SELECT vote_unit_price, currency FROM settings WHERE id = 1`
  const row = rows[0] ?? { vote_unit_price: null, currency: null }
  return ok({ vote_unit_price: row.vote_unit_price, currency: row.currency })
}
