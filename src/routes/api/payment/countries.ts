import { createFileRoute } from '@tanstack/react-router'
import { getCountriesList } from '../../../../server/services/payment'
import { jsonResult, toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/payment/countries')({
  server: {
    handlers: {
      GET: () => {
        try {
          return jsonResult(getCountriesList())
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
