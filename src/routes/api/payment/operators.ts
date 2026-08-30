import { createFileRoute } from '@tanstack/react-router'
import { getFeexpay } from '../../../../server/utils/context'
import { getOperatorsList } from '../../../../server/services/payment'
import { jsonResult, toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/payment/operators')({
  server: {
    handlers: {
      GET: ({ request }) => {
        try {
          const country = new URL(request.url).searchParams.get('country')
          return jsonResult(getOperatorsList(Boolean(getFeexpay()), country ? country : 'BJ'))
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
