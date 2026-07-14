// CRUD candidats côté admin (Neon). La suppression est un soft-delete : la FK
// votes.candidate_id est ON DELETE CASCADE, donc effacer la ligne détruirait les
// votes (records financiers) et casserait le join des reçus. On marque
// deleted_at et on retire seulement les photos + blobs (pas des données d'audit).
import type { Db } from '../../types'
import { isUuid } from '../candidates'
import { ok, fail, ERRORS, type HttpResult } from '../../lib/errors'

const MAX_NAME_LENGTH = 120
const MAX_CAPTION_LENGTH = 200

export interface CandidateAdminDeps {
  db: Db
}

export interface CandidateInput {
  full_name?: unknown
  atelier?: unknown
  commune?: unknown
  phone?: unknown
  profile_photo_url?: unknown
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

// Extrait l'id du blob d'une URL /api/photos/{id}, ou null.
function blobIdFromUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const match = url.match(/\/api\/photos\/([0-9a-f-]{36})$/i)
  return match ? match[1]! : null
}

export async function listAdminCandidates(deps: CandidateAdminDeps): Promise<HttpResult> {
  const rows = await deps.db`
    SELECT c.id, c.full_name, c.atelier, c.commune, c.phone, c.profile_photo_url, c.vote_count,
           (SELECT COUNT(*)::int FROM candidate_photos p WHERE p.candidate_id = c.id) AS photos_count
    FROM candidates c
    WHERE c.deleted_at IS NULL
    ORDER BY c.vote_count DESC, c.created_at ASC`
  return ok(rows)
}

export async function createCandidate(
  deps: CandidateAdminDeps,
  input: CandidateInput,
): Promise<HttpResult> {
  const fullName = cleanText(input.full_name, MAX_NAME_LENGTH)
  if (!fullName) return fail(ERRORS.VALIDATION, 'Le nom du candidat est requis')

  const rows = await deps.db`
    INSERT INTO candidates (full_name, atelier, commune, phone, profile_photo_url)
    VALUES (${fullName}, ${cleanText(input.atelier, MAX_NAME_LENGTH)},
            ${cleanText(input.commune, MAX_NAME_LENGTH)}, ${cleanText(input.phone, MAX_NAME_LENGTH)},
            ${cleanText(input.profile_photo_url, 300)})
    RETURNING id`
  return ok({ id: String(rows[0]?.id) }, 201)
}

export async function updateCandidate(
  deps: CandidateAdminDeps,
  id: string,
  input: CandidateInput,
): Promise<HttpResult> {
  if (!isUuid(id)) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')
  const fullName = cleanText(input.full_name, MAX_NAME_LENGTH)
  if (!fullName) return fail(ERRORS.VALIDATION, 'Le nom du candidat est requis')

  const rows = await deps.db`
    UPDATE candidates
    SET full_name = ${fullName},
        atelier = ${cleanText(input.atelier, MAX_NAME_LENGTH)},
        commune = ${cleanText(input.commune, MAX_NAME_LENGTH)},
        phone = ${cleanText(input.phone, MAX_NAME_LENGTH)},
        profile_photo_url = ${cleanText(input.profile_photo_url, 300)},
        updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id`
  if (!rows[0]) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')
  return ok({ id })
}

export async function deleteCandidate(deps: CandidateAdminDeps, id: string): Promise<HttpResult> {
  if (!isUuid(id)) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')

  return deps.db.begin(async (tx) => {
    const candidateRows = await tx`
      SELECT id, profile_photo_url FROM candidates WHERE id = ${id} AND deleted_at IS NULL`
    const candidate = candidateRows[0]
    if (!candidate) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')

    const photoRows = await tx`SELECT storage_key FROM candidate_photos WHERE candidate_id = ${id}`
    const blobIds = photoRows
      .map((row) => row.storage_key)
      .filter((key): key is string => isUuid(key))
    const profileBlob = blobIdFromUrl(candidate.profile_photo_url)
    if (profileBlob) blobIds.push(profileBlob)

    await tx`DELETE FROM candidate_photos WHERE candidate_id = ${id}`
    if (blobIds.length > 0) {
      await tx`DELETE FROM photo_files WHERE id = ANY(${blobIds})`
    }
    await tx`UPDATE candidates SET deleted_at = now(), profile_photo_url = NULL WHERE id = ${id}`

    return ok({ id })
  }) as Promise<HttpResult>
}

export interface PhotoLinkInput {
  blobId: unknown
  caption?: unknown
}

export async function addCandidatePhoto(
  deps: CandidateAdminDeps,
  candidateId: string,
  input: PhotoLinkInput,
): Promise<HttpResult> {
  if (!isUuid(candidateId)) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')
  if (!isUuid(input.blobId)) return fail(ERRORS.VALIDATION, 'Photo invalide')

  const candidateRows =
    await deps.db`SELECT id FROM candidates WHERE id = ${candidateId} AND deleted_at IS NULL`
  if (!candidateRows[0]) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')

  const orderRows = await deps.db`
    SELECT COALESCE(MAX(photo_order), 0) + 1 AS next_order
    FROM candidate_photos WHERE candidate_id = ${candidateId}`
  const nextOrder = Number(orderRows[0]?.next_order) || 1

  const rows = await deps.db`
    INSERT INTO candidate_photos (candidate_id, photo_url, storage_key, caption, photo_order)
    VALUES (${candidateId}, ${`/api/photos/${input.blobId}`}, ${input.blobId},
            ${cleanText(input.caption, MAX_CAPTION_LENGTH)}, ${nextOrder})
    RETURNING id`
  return ok({ id: String(rows[0]?.id), url: `/api/photos/${input.blobId}` }, 201)
}

export async function removeCandidatePhoto(
  deps: CandidateAdminDeps,
  photoId: string,
): Promise<HttpResult> {
  if (!isUuid(photoId)) return fail(ERRORS.NOT_FOUND, 'Photo introuvable')

  return deps.db.begin(async (tx) => {
    const rows = await tx`SELECT storage_key FROM candidate_photos WHERE id = ${photoId}`
    const photo = rows[0]
    if (!photo) return fail(ERRORS.NOT_FOUND, 'Photo introuvable')

    await tx`DELETE FROM candidate_photos WHERE id = ${photoId}`
    if (isUuid(photo.storage_key)) {
      await tx`DELETE FROM photo_files WHERE id = ${photo.storage_key}`
    }
    return ok({ id: photoId })
  }) as Promise<HttpResult>
}
