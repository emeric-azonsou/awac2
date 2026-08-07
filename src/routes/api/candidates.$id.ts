import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../server/lib/db'
import { getCandidateWithPhotos } from '../../../server/services/candidates'
import { jsonResult, toErrorResponse } from '../../../server/lib/httpResult'

export const Route = createFileRoute('/api/candidates/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          return jsonResult(await getCandidateWithPhotos(getDb(), params.id ?? ''))
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
