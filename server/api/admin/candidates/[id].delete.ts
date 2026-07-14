import { getDb } from '../../../lib/db'
import { requireAdminSession } from '../../../lib/adminSession'
import { deleteCandidate } from '../../../services/admin/candidates'
export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const id = getRouterParam(event, 'id') ?? ''
  const result = await deleteCandidate({ db: getDb() }, id)
  setResponseStatus(event, result.status)
  return result.body
})
