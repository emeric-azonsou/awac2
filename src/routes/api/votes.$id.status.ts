import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../server/lib/db'
import { getFeexpay } from '../../../server/utils/context'
import { getVoteStatus } from '../../../server/services/votes'
import { jsonResult, toErrorResponse } from '../../../server/lib/httpResult'

export const Route = createFileRoute('/api/votes/$id/status')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          return jsonResult(
            await getVoteStatus({ db: getDb(), feexpay: getFeexpay() }, params.id ?? ''),
          )
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
