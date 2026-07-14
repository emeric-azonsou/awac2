import { getDb } from '../../../lib/db'
import { getSebpay } from '../../../utils/context'
import { getVoteStatus } from '../../../services/votes'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const result = await getVoteStatus({ db: getDb(), sebpay: getSebpay() }, id)
  setResponseStatus(event, result.status)
  return result.body
})
