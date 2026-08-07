import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { requireAdminSession } from '../../../../server/lib/adminSession'
import { getFeexpay } from '../../../../server/utils/context'
import { createNotifierFromEnv } from '../../../../server/lib/notifier'
import { reconcilePendingVotes } from '../../../../server/services/reconciliation'
import { toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/admin/reconcile')({
  server: {
    handlers: {
      POST: async () => {
        try {
          await requireAdminSession()
          const summary = await reconcilePendingVotes(
            { db: getDb(), feexpay: getFeexpay(), notifier: createNotifierFromEnv() },
            { olderThanMinutes: 0 },
          )
          return Response.json(summary)
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
