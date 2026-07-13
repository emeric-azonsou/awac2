import { Hono } from 'hono'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

router.get('/public', async (c) => {
  const db = c.get('db')
  const rows = await db`SELECT vote_unit_price, currency FROM settings WHERE id = 1`
  const row = rows[0] ?? { vote_unit_price: null, currency: null }
  return c.json({ vote_unit_price: row.vote_unit_price, currency: row.currency })
})

export default router
