import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../server/lib/db'
import { getFeexpay } from '../../../server/utils/context'
import { getReceipt } from '../../../server/services/receipts'
import { jsonResult, toErrorResponse } from '../../../server/lib/httpResult'

export const Route = createFileRoute('/api/receipts/$code')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          return jsonResult(
            await getReceipt({ db: getDb(), feexpay: getFeexpay() }, params.code ?? ''),
          )
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
