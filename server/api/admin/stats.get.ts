import { getDb } from '../../lib/db'
import { requireAdminSession } from '../../lib/adminSession'
import { getAdminStats } from '../../services/admin/stats'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const result = await getAdminStats({ db: getDb() })
  setResponseStatus(event, result.status)
  return result.body
})
