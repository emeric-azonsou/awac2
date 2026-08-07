import crypto from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { getFeexpay } from '../../../../server/utils/context'
import { createNotifierFromEnv } from '../../../../server/lib/notifier'
import { reconcilePendingVotes } from '../../../../server/services/reconciliation'
import { errorResponse, toErrorResponse } from '../../../../server/lib/httpResult'

// Le hachage préalable égalise les longueurs : timingSafeEqual exige deux
// buffers de même taille et lèverait sinon sur une simple différence de
// longueur, ce qui trahirait la taille du secret.
function safeEquals(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest()
  const hashB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

export const Route = createFileRoute('/api/cron/reconcile')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const secret = process.env.CRON_SECRET ?? ''
          const authorization = request.headers.get('authorization') ?? ''
          if (!secret || !safeEquals(authorization, `Bearer ${secret}`)) {
            return errorResponse(401, 'unauthorized', 'Authentification requise')
          }
          const summary = await reconcilePendingVotes(
            { db: getDb(), feexpay: getFeexpay(), notifier: createNotifierFromEnv() },
            {},
          )
          return Response.json(summary)
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
