import { getDb } from '../../lib/db'
import { getFeexpay, getFeexpayWebhookSecret } from '../../utils/context'
import { processWebhook } from '../../services/votes'
export default defineEventHandler(async (event) => {
  const rawBody = (await readRawBody(event)) ?? ''
  const queryToken = getQuery(event).token
  const token = typeof queryToken === 'string' && queryToken ? queryToken : null
  const result = await processWebhook(
    { db: getDb(), feexpay: getFeexpay(), secret: getFeexpayWebhookSecret() },
    rawBody,
    token,
  )
  setResponseStatus(event, result.status)
  return result.body
})
