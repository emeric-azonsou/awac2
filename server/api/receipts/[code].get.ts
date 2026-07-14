import { getDb } from '../../lib/db'
import { getSebpay } from '../../utils/context'
import { getReceipt } from '../../services/receipts'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code') ?? ''
  const result = await getReceipt({ db: getDb(), sebpay: getSebpay() }, code)
  setResponseStatus(event, result.status)
  return result.body
})
