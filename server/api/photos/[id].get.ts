import { getDb } from '../../lib/db'
import { getPhotoFile } from '../../services/admin/photos'

// Diffusion publique des blobs photos. Cache CDN immutable : chaque photo a un
// id unique, Neon n'est lu qu'une fois puis le CDN Vercel sert la copie.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const photo = await getPhotoFile({ db: getDb() }, id)
  if (!photo) {
    setResponseStatus(event, 404)
    return { error: { code: 'not_found', message: 'Photo introuvable' } }
  }
  setResponseHeader(event, 'content-type', photo.contentType)
  setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  return photo.data
})
