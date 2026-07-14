import { getDb } from '../../../lib/db'
import { requireAdminSession } from '../../../lib/adminSession'
import { createCandidate } from '../../../services/admin/candidates'
export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const result = await createCandidate({ db: getDb() }, body)
  setResponseStatus(event, result.status)
  return result.body
})
