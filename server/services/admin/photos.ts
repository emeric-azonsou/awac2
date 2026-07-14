// Stockage des photos dans Neon (table photo_files, colonne bytea). Validation
// par magic bytes (jamais confiance au content-type client) + plafond de taille.
import type { Db } from '../../types'
import { isUuid } from '../candidates'
import { ok, fail, ERRORS, type HttpResult, type ErrorEntry } from '../../lib/errors'

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024

const TOO_LARGE: ErrorEntry = {
  status: 413,
  code: 'file_too_large',
  message: `Image trop lourde (maximum ${Math.round(MAX_PHOTO_BYTES / (1024 * 1024))} Mo)`,
}

// Renvoie le type MIME si le contenu est une image jpeg/png/webp, sinon null.
export function detectImageType(data: Buffer): string | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47
  ) {
    return 'image/png'
  }
  if (
    data.length >= 12 &&
    data.toString('ascii', 0, 4) === 'RIFF' &&
    data.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export interface PhotoDeps {
  db: Db
}

export async function storePhotoFile(deps: PhotoDeps, data: Buffer): Promise<HttpResult> {
  if (!data || data.length === 0) return fail(ERRORS.VALIDATION, 'Fichier vide')
  if (data.length > MAX_PHOTO_BYTES) return fail(TOO_LARGE)

  const contentType = detectImageType(data)
  if (!contentType) return fail(ERRORS.VALIDATION, 'Format non supporté (JPEG, PNG ou WebP)')

  const rows = await deps.db`
    INSERT INTO photo_files (content_type, data, byte_size)
    VALUES (${contentType}, ${data}, ${data.length})
    RETURNING id`
  const id = String(rows[0]?.id)
  return ok({ id, url: `/api/photos/${id}` }, 201)
}

export interface PhotoFile {
  contentType: string
  data: Buffer
}

export async function getPhotoFile(deps: PhotoDeps, id: string): Promise<PhotoFile | null> {
  if (!isUuid(id)) return null
  const rows = await deps.db`SELECT content_type, data FROM photo_files WHERE id = ${id}`
  const row = rows[0]
  if (!row) return null
  return { contentType: String(row.content_type), data: row.data as Buffer }
}
