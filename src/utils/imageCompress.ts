import { ApiError } from './api'
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

// N'utilise pas le client `api` : celui-ci sérialise son corps en JSON, alors
// que cette route attend les octets bruts de l'image.
export async function uploadCandidatePhoto(file: File): Promise<UploadedPhoto> {
  const blob = await compressImage(file)
  const response = await fetch('/api/admin/photos', {
    method: 'POST',
    body: blob,
    headers: { 'content-type': 'image/jpeg' },
  })
  if (!response.ok) {
    throw new ApiError('upload_failed', "Échec de l'envoi de l'image", response.status)
  }
  return (await response.json()) as UploadedPhoto
}
