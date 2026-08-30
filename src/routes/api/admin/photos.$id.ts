import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { requireAdminSession } from '../../../../server/lib/adminSession'
import { removeCandidatePhoto } from '../../../../server/services/admin/candidates'
import { jsonResult, toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/admin/photos/$id')({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        try {
          await requireAdminSession()
          return jsonResult(await removeCandidatePhoto({ db: getDb() }, params.id ?? ''))
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
