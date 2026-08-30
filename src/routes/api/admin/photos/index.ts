import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../../server/lib/db'
import { requireAdminSession } from '../../../../../server/lib/adminSession'
import { storePhotoFile } from '../../../../../server/services/admin/photos'
import { jsonResult, toErrorResponse } from '../../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/admin/photos/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireAdminSession()
          const buffer = Buffer.from(await request.arrayBuffer())
          return jsonResult(await storePhotoFile({ db: getDb() }, buffer))
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
