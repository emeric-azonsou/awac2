import { getDb } from '../../lib/db'
import { getCandidateWithPhotos } from '../../services/candidates'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const result = await getCandidateWithPhotos(getDb(), id)
  setResponseStatus(event, result.status)
  return result.body
})
