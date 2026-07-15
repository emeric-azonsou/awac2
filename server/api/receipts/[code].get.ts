import { getDb } from '../../lib/db'
import { getFeexpay } from '../../utils/context'
import { getReceipt } from '../../services/receipts'
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code') ?? ''
  const result = await getReceipt({ db: getDb(), feexpay: getFeexpay() }, code)
  setResponseStatus(event, result.status)
  return result.body
})
