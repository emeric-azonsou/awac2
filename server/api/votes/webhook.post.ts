import { getDb } from '../../lib/db'
import { getSebpaySecret } from '../../utils/context'
import { processWebhook } from '../../services/votes'

export default defineEventHandler(async (event) => {
  const rawBody = (await readRawBody(event)) ?? ''
  const signature = getHeader(event, 'x-sebpay-signature') ?? null
  const result = await processWebhook(
    { db: getDb(), secret: getSebpaySecret() },
    rawBody,
    signature,
  )
  setResponseStatus(event, result.status)
  return result.body
})
