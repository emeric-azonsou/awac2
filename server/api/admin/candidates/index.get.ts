import { getDb } from '../../../lib/db'
import { requireAdminSession } from '../../../lib/adminSession'
import { listAdminCandidates } from '../../../services/admin/candidates'
export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const result = await listAdminCandidates({ db: getDb() })
  setResponseStatus(event, result.status)
  return result.body
})
