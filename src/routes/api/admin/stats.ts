import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { requireAdminSession } from '../../../../server/lib/adminSession'
import { getAdminStats } from '../../../../server/services/admin/stats'
import { jsonResult, toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/admin/stats')({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession()
          return jsonResult(await getAdminStats({ db: getDb() }))
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
