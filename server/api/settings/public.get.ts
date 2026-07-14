import { getDb } from '../../lib/db'
import { getPublicSettings } from '../../services/settings'
export default defineEventHandler(async (event) => {
  const result = await getPublicSettings(getDb())
  setResponseStatus(event, result.status)
  return result.body
})
