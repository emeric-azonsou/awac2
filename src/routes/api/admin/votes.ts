import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { requireAdminSession } from '../../../../server/lib/adminSession'
import { listAdminVotes } from '../../../../server/services/admin/votes'
import { jsonResult, toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/admin/votes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminSession()
          const query = new URL(request.url).searchParams
          const page = query.get('page')
          const limit = query.get('limit')
          return jsonResult(
            await listAdminVotes(
              { db: getDb() },
              {
                status: query.get('status') ?? undefined,
                candidateId: query.get('candidate') ?? undefined,
                search: query.get('search') ?? undefined,
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
              },
            ),
          )
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
