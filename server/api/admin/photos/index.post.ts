import { getDb } from '../../../lib/db'
import { requireAdminSession } from '../../../lib/adminSession'
import { storePhotoFile } from '../../../services/admin/photos'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const body = await readRawBody(event, false)
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body ?? '')
  const result = await storePhotoFile({ db: getDb() }, buffer)
  setResponseStatus(event, result.status)
  return result.body
})
