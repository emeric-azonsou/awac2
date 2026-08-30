import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { requireAdminSession } from '../../../../server/lib/adminSession'
import { updateCandidate, deleteCandidate } from '../../../../server/services/admin/candidates'
import { jsonResult, readJsonBody, toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/admin/candidates/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          await requireAdminSession()
          const body = await readJsonBody(request)
          return jsonResult(await updateCandidate({ db: getDb() }, params.id ?? '', body))
        } catch (err) {
          return toErrorResponse(err)
        }
      },
      DELETE: async ({ params }) => {
        try {
          await requireAdminSession()
          return jsonResult(await deleteCandidate({ db: getDb() }, params.id ?? ''))
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
