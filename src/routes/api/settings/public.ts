import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { getPublicSettings } from '../../../../server/services/settings'
import { jsonResult, toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/settings/public')({
  server: {
    handlers: {
      GET: async () => {
        try {
          return jsonResult(await getPublicSettings(getDb()))
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
