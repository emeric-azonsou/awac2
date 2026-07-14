import { getDb } from '../../../lib/db'
import { requireAdminSession } from '../../../lib/adminSession'
import { removeCandidatePhoto } from '../../../services/admin/candidates'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const photoId = getRouterParam(event, 'id') ?? ''
  const result = await removeCandidatePhoto({ db: getDb() }, photoId)
  setResponseStatus(event, result.status)
  return result.body
})
