import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { getFeexpay } from '../../../../server/utils/context'
import { submitVote } from '../../../../server/services/votes'
import { jsonResult, readJsonBody, toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/votes/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody(request)
          return jsonResult(await submitVote({ db: getDb(), feexpay: getFeexpay() }, body))
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
