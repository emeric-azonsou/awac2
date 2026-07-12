import { Hono } from 'hono'

const router = new Hono()

router.get('/public', async (c) => {
  const db = c.get('db')
  const rows = await db`SELECT vote_unit_price, currency FROM settings WHERE id = 1`
  const { vote_unit_price, currency } = rows[0]
  return c.json({ vote_unit_price, currency })
})

export default router
