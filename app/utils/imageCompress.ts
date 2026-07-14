// Compression d'image côté navigateur avant upload : redimensionne à MAX_EDGE
// puis encode en JPEG. Réduit le poids (plafond requête Vercel 4,5 Mo, stockage
// Neon) et le temps d'upload sur mobile lent. Renvoie un Blob JPEG.

const MAX_EDGE = 1600
const JPEG_QUALITY = 0.82

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error("Impossible de préparer l'image")
  }
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Échec de compression de l'image"))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

export interface UploadedPhoto {
  id: string
  url: string
}

// Compresse puis envoie le blob à l'API admin, renvoie l'id + l'URL du blob.
export async function uploadCandidatePhoto(file: File): Promise<UploadedPhoto> {
  const blob = await compressImage(file)
  return $fetch<UploadedPhoto>('/api/admin/photos', {
    method: 'POST',
    body: blob,
    headers: { 'content-type': 'image/jpeg' },
  })
}
