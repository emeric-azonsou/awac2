import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../server/lib/db'
import { getPhotoFile } from '../../../server/services/admin/photos'
import { errorResponse, toErrorResponse } from '../../../server/lib/httpResult'

export const Route = createFileRoute('/api/photos/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const photo = await getPhotoFile({ db: getDb() }, params.id ?? '')
          if (!photo) return errorResponse(404, 'not_found', 'Photo introuvable')
          return new Response(photo.data, {
            headers: {
              'content-type': photo.contentType,
              'cache-control': 'public, max-age=31536000, immutable',
            },
          })
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
