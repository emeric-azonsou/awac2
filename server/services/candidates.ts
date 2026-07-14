import type { Db } from '../types'
import { ok, fail, ERRORS, type HttpResult } from '../lib/errors'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export async function listCandidates(db: Db): Promise<HttpResult> {
  const rows = await db`
    SELECT id, full_name, atelier, commune, profile_photo_url, vote_count
    FROM candidates
    WHERE deleted_at IS NULL
    ORDER BY vote_count DESC, created_at ASC`
  return ok(rows)
}

export async function getCandidateWithPhotos(db: Db, id: string): Promise<HttpResult> {
  if (!isUuid(id)) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')
  const rows = await db`
    SELECT id, full_name, atelier, commune, profile_photo_url, vote_count
    FROM candidates
    WHERE id = ${id} AND deleted_at IS NULL`
  const candidate = rows[0]
  if (!candidate) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')
  const photos = await db`
    SELECT id, photo_url, caption, photo_order
    FROM candidate_photos
    WHERE candidate_id = ${id}
    ORDER BY photo_order ASC`
  return ok({ ...candidate, photos })
}
