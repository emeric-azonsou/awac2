import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { listCandidates } from '../../../../server/services/candidates'
import { jsonResult, toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/candidates/')({
  server: {
    handlers: {
      GET: async () => {
        try {
          return jsonResult(await listCandidates(getDb()))
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
