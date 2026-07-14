import { describe, it, expect } from 'vitest'
import {
  storePhotoFile,
  getPhotoFile,
  MAX_PHOTO_BYTES,
  detectImageType,
} from '../../server/services/admin/photos'
import { recordingDb, asDb } from './helpers'
import type { Db } from '../../server/types'

// En-têtes magiques minimaux pour chaque type accepté.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')])
const NEW_ID = '11111111-2222-3333-4444-555555555555'

describe('detectImageType', () => {
  it('reconnaît jpeg, png, webp par magic bytes', () => {
    expect(detectImageType(JPEG)).toBe('image/jpeg')
    expect(detectImageType(PNG)).toBe('image/png')
    expect(detectImageType(WEBP)).toBe('image/webp')
  })

  it('rejette un contenu non-image (ex. exécutable / texte)', () => {
    expect(detectImageType(Buffer.from('#!/bin/sh\nrm -rf'))).toBeNull()
    expect(detectImageType(Buffer.from([0x00, 0x01, 0x02]))).toBeNull()
  })
})

describe('storePhotoFile', () => {
  it('insère un blob valide et renvoie son URL /api/photos/{id}', async () => {
    const db = recordingDb([{ id: NEW_ID }])
    const res = await storePhotoFile({ db: asDb(db) as unknown as Db }, JPEG)
    expect(res.status).toBe(201)
    const body = res.body as Record<string, unknown>
    expect(body.id).toBe(NEW_ID)
    expect(body.url).toBe(`/api/photos/${NEW_ID}`)
    expect(db.calls.some((call) => call.sql.includes('INSERT INTO photo_files'))).toBe(true)
  })

  it('refuse un fichier non-image (400) sans écrire en base', async () => {
    const db = recordingDb([{ id: NEW_ID }])
    const res = await storePhotoFile(
      { db: asDb(db) as unknown as Db },
      Buffer.from('pas une image'),
    )
    expect(res.status).toBe(400)
    expect(db.calls.length).toBe(0)
  })

  it('refuse un fichier trop volumineux (413) sans écrire en base', async () => {
    const db = recordingDb([{ id: NEW_ID }])
    const oversize = Buffer.concat([JPEG, Buffer.alloc(MAX_PHOTO_BYTES + 1)])
    const res = await storePhotoFile({ db: asDb(db) as unknown as Db }, oversize)
    expect(res.status).toBe(413)
    expect(db.calls.length).toBe(0)
  })

  it('refuse un buffer vide (400)', async () => {
    const db = recordingDb([{ id: NEW_ID }])
    const res = await storePhotoFile({ db: asDb(db) as unknown as Db }, Buffer.alloc(0))
    expect(res.status).toBe(400)
    expect(db.calls.length).toBe(0)
  })
})

describe('getPhotoFile', () => {
  it('renvoie le contenu et le content-type pour un id valide', async () => {
    const stored = { content_type: 'image/jpeg', data: JPEG }
    const db = recordingDb([stored])
    const res = await getPhotoFile({ db: asDb(db) as unknown as Db }, NEW_ID)
    expect(res).not.toBeNull()
    expect(res?.contentType).toBe('image/jpeg')
    expect(Buffer.from(res!.data).equals(JPEG)).toBe(true)
  })

  it('renvoie null pour un id inconnu', async () => {
    const db = recordingDb([])
    const res = await getPhotoFile({ db: asDb(db) as unknown as Db }, NEW_ID)
    expect(res).toBeNull()
  })

  it('renvoie null pour un id au format invalide sans requête', async () => {
    const db = recordingDb([])
    const res = await getPhotoFile({ db: asDb(db) as unknown as Db }, 'pas-un-uuid')
    expect(res).toBeNull()
    expect(db.calls.length).toBe(0)
  })
})
