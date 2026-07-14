import { getDb } from '../../../../lib/db'
import { requireAdminSession } from '../../../../lib/adminSession'
import { addCandidatePhoto } from '../../../../services/admin/candidates'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const candidateId = getRouterParam(event, 'id') ?? ''
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const result = await addCandidatePhoto({ db: getDb() }, candidateId, {
    blobId: body.blob_id,
    caption: body.caption,
  })
  setResponseStatus(event, result.status)
  return result.body
})
