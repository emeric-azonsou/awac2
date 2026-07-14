import crypto from 'node:crypto'
import { getDb } from '../../lib/db'
import { getSebpay } from '../../utils/context'
import { createNotifierFromEnv } from '../../lib/notifier'
import { reconcilePendingVotes } from '../../services/reconciliation'

// Hash avant comparaison : longueurs égalisées pour timingSafeEqual.
function safeEquals(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest()
  const hashB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

// Filet de sécurité appelé par le cron Vercel (Authorization: Bearer CRON_SECRET,
// envoyé automatiquement quand la variable CRON_SECRET existe sur le projet).
export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET ?? ''
  const authorization = getHeader(event, 'authorization') ?? ''
  if (!secret || !safeEquals(authorization, `Bearer ${secret}`)) {
    setResponseStatus(event, 401)
    return { error: { code: 'unauthorized', message: 'Authentification requise' } }
  }

  const summary = await reconcilePendingVotes(
    { db: getDb(), sebpay: getSebpay(), notifier: createNotifierFromEnv() },
    {},
  )
  return summary
})
