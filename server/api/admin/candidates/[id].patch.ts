import { getDb } from '../../../lib/db'
import { requireAdminSession } from '../../../lib/adminSession'
import { updateCandidate } from '../../../services/admin/candidates'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const result = await updateCandidate({ db: getDb() }, id, body)
  setResponseStatus(event, result.status)
  return result.body
})
