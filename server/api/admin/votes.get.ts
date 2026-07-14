import { getDb } from '../../lib/db'
import { requireAdminSession } from '../../lib/adminSession'
import { listAdminVotes } from '../../services/admin/votes'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const query = getQuery(event)
  const result = await listAdminVotes(
    { db: getDb() },
    {
      status: typeof query.status === 'string' ? query.status : undefined,
      candidateId: typeof query.candidate === 'string' ? query.candidate : undefined,
      search: typeof query.search === 'string' ? query.search : undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    },
  )
  setResponseStatus(event, result.status)
  return result.body
})
