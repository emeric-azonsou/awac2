import { getDb } from '../../../lib/db'
import { requireAdminSession } from '../../../lib/adminSession'
import { storePhotoFile } from '../../../services/admin/photos'

// Upload d'un blob photo (corps binaire brut). Réservé admin. La validation
// magic-bytes + taille est dans le service.
export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const body = await readRawBody(event, false)
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body ?? '')
  const result = await storePhotoFile({ db: getDb() }, buffer)
  setResponseStatus(event, result.status)
  return result.body
})
