import crypto from 'node:crypto'
import { getDb } from '../../lib/db'
import { getFeexpay } from '../../utils/context'
import { createNotifierFromEnv } from '../../lib/notifier'
import { reconcilePendingVotes } from '../../services/reconciliation'

function safeEquals(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest()
  const hashB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET ?? ''
  const authorization = getHeader(event, 'authorization') ?? ''
  if (!secret || !safeEquals(authorization, `Bearer ${secret}`)) {
    setResponseStatus(event, 401)
    return { error: { code: 'unauthorized', message: 'Authentification requise' } }
  }
  const summary = await reconcilePendingVotes(
    { db: getDb(), feexpay: getFeexpay(), notifier: createNotifierFromEnv() },
    {},
  )
  return summary
})
