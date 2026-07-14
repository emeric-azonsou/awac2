import { getDb } from '../../lib/db'
import { getPhotoFile } from '../../services/admin/photos'

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
