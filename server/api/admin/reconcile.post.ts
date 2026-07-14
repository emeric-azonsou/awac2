import { getDb } from '../../lib/db'
import { requireAdminSession } from '../../lib/adminSession'
import { getSebpay } from '../../utils/context'
import { createNotifierFromEnv } from '../../lib/notifier'
import { reconcilePendingVotes } from '../../services/reconciliation'

// Réconciliation manuelle déclenchée par l'admin : contrairement au cron, on
// vérifie TOUS les votes pending (olderThanMinutes: 0), pas seulement les vieux.
export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const summary = await reconcilePendingVotes(
    { db: getDb(), sebpay: getSebpay(), notifier: createNotifierFromEnv() },
    { olderThanMinutes: 0 },
  )
  return summary
})
