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
          // Le service renvoie un Buffer Node, absent de BodyInit. La vue
          // Uint8Array pointe sur la même mémoire : aucune copie des octets.
          // Le cast restreint ArrayBufferLike a ArrayBuffer, que BodyInit
          // accepte : un Buffer issu du driver postgres n'est jamais adosse a
          // un SharedArrayBuffer, seul autre membre de cette union.
          const bytes = photo.data
          const body = new Uint8Array(
            bytes.buffer as ArrayBuffer,
            bytes.byteOffset,
            bytes.byteLength,
          )
          return new Response(body, {
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
