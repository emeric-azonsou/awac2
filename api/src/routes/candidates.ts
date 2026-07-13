import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sendError, ERRORS } from '../lib/errors.ts'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

const router = new Hono<AppEnv>()

router.get('/', async (c) => {
  const db = c.get('db')
  const rows = await db`
    SELECT id, full_name, atelier, commune, profile_photo_url, vote_count
    FROM candidates
    ORDER BY vote_count DESC, created_at ASC`
  return c.json(rows)
})

router.get('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  if (!isUuid(id)) return sendError(c, ERRORS.NOT_FOUND, 'Candidat introuvable')
  const rows = await db`
    SELECT id, full_name, atelier, commune, profile_photo_url, vote_count
    FROM candidates
    WHERE id = ${id}`
  if (rows.length === 0) return sendError(c, ERRORS.NOT_FOUND, 'Candidat introuvable')
  const photos = await db`
    SELECT id, photo_url, caption, photo_order
    FROM candidate_photos
    WHERE candidate_id = ${id}
    ORDER BY photo_order ASC`
  return c.json({ ...rows[0], photos })
})

export default router
