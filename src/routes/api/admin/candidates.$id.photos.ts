import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { requireAdminSession } from '../../../../server/lib/adminSession'
import { addCandidatePhoto } from '../../../../server/services/admin/candidates'
import { jsonResult, readJsonBody, toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/admin/candidates/$id/photos')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          await requireAdminSession()
          const body = await readJsonBody(request)
          return jsonResult(
            await addCandidatePhoto({ db: getDb() }, params.id ?? '', {
              blobId: body.blob_id,
              caption: body.caption,
            }),
          )
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
