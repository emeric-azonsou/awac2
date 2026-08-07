import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../../server/lib/db'
import { requireAdminSession } from '../../../../../server/lib/adminSession'
import {
  listAdminCandidates,
  createCandidate,
} from '../../../../../server/services/admin/candidates'
import { jsonResult, readJsonBody, toErrorResponse } from '../../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/admin/candidates/')({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession()
          return jsonResult(await listAdminCandidates({ db: getDb() }))
        } catch (err) {
          return toErrorResponse(err)
        }
      },
      POST: async ({ request }) => {
        try {
          await requireAdminSession()
          const body = await readJsonBody(request)
          return jsonResult(await createCandidate({ db: getDb() }, body))
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
