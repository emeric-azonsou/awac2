import { getDb } from '../../lib/db'
import { getFeexpay } from '../../utils/context'
import { submitVote } from '../../services/votes'
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const result = await submitVote({ db: getDb(), feexpay: getFeexpay() }, body)
  setResponseStatus(event, result.status)
  return result.body
})
