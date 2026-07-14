import { getDb } from '../../lib/db'
import { listCandidates } from '../../services/candidates'
export default defineEventHandler(async (event) => {
  const result = await listCandidates(getDb())
  setResponseStatus(event, result.status)
  return result.body
})
