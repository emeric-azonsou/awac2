import { describe, it, expect } from 'vitest'
import {
  listAdminCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  addCandidatePhoto,
  removeCandidatePhoto,
} from '../../server/services/admin/candidates'
import { recordingDb, asDb } from './helpers'
import type { Db } from '../../server/types'
const CANDIDATE_ID = '6a3c0e1f-2b4d-4f5a-9c8e-1d2f3a4b5c6d'
const PHOTO_ID = '11111111-2222-3333-4444-555555555555'
const BLOB_ID = '99999999-8888-7777-6666-555555555555'
describe('listAdminCandidates', () => {
  it('renvoie la liste avec le nombre de photos', async () => {
    const db = recordingDb([
      {
        id: CANDIDATE_ID,
        full_name: 'Awa',
        atelier: 'A',
        commune: 'Lokossa',
        profile_photo_url: '/api/photos/x',
        vote_count: 5,
        photos_count: 3,
      },
    ])
    const res = await listAdminCandidates({ db: asDb(db) as unknown as Db })
    expect(res.status).toBe(200)
    expect((res.body as unknown[]).length).toBe(1)
    expect((res.body as Record<string, unknown>[])[0]!.photos_count).toBe(3)
  })
})
describe('createCandidate', () => {
  it('crée un candidat avec nom + catégorie (autres champs optionnels)', async () => {
    const db = recordingDb([{ id: CANDIDATE_ID }])
    const res = await createCandidate(
      { db: asDb(db) as unknown as Db },
      { full_name: 'Awa Bocovo', category: 'femme' },
    )
    expect(res.status).toBe(201)
    expect((res.body as Record<string, unknown>).id).toBe(CANDIDATE_ID)
    expect(db.calls.some((c) => c.sql.includes('INSERT INTO candidates'))).toBe(true)
  })
  it('refuse un nom vide (400) sans insertion', async () => {
    const db = recordingDb([{ id: CANDIDATE_ID }])
    const res = await createCandidate({ db: asDb(db) as unknown as Db }, { full_name: '   ' })
    expect(res.status).toBe(400)
    expect(db.calls.length).toBe(0)
  })
})
describe('updateCandidate', () => {
  it('met à jour les infos et renvoie 200', async () => {
    const db = recordingDb((sql) =>
      sql.includes('RETURNING') || sql.includes('UPDATE') ? [{ id: CANDIDATE_ID }] : [],
    )
    const res = await updateCandidate({ db: asDb(db) as unknown as Db }, CANDIDATE_ID, {
      full_name: 'Awa B.',
      commune: 'Cotonou',
    })
    expect(res.status).toBe(200)
  })
  it('renvoie 404 pour un id invalide', async () => {
    const db = recordingDb([])
    const res = await updateCandidate({ db: asDb(db) as unknown as Db }, 'pas-uuid', {
      full_name: 'X',
    })
    expect(res.status).toBe(404)
    expect(db.calls.length).toBe(0)
  })
})
describe('deleteCandidate', () => {
  it('soft-delete le candidat, supprime photos + blobs, conserve les votes', async () => {
    const db = recordingDb((sql) => {
      if (sql.includes('FROM candidate_photos')) return [{ storage_key: BLOB_ID }]
      if (sql.includes('FROM candidates') && sql.includes('WHERE id'))
        return [{ id: CANDIDATE_ID, profile_photo_url: `/api/photos/${BLOB_ID}` }]
      return []
    })
    const res = await deleteCandidate({ db: asDb(db) as unknown as Db }, CANDIDATE_ID)
    expect(res.status).toBe(200)
    const sqls = db.calls.map((c) => c.sql).join(' | ')

    expect(sqls).toContain('UPDATE candidates')
    expect(sqls).toContain('deleted_at')
    expect(sqls).toContain('DELETE FROM candidate_photos')
    expect(sqls).toContain('DELETE FROM photo_files')
    expect(sqls).not.toContain('DELETE FROM votes')
    expect(sqls).not.toContain('DELETE FROM candidates')
  })
  it('renvoie 404 si le candidat n’existe pas ou est déjà supprimé', async () => {
    const db = recordingDb([])
    const res = await deleteCandidate({ db: asDb(db) as unknown as Db }, CANDIDATE_ID)
    expect(res.status).toBe(404)
  })
})
describe('addCandidatePhoto', () => {
  it('lie un blob existant au candidat comme photo de réalisation', async () => {
    const db = recordingDb((sql) => {
      if (sql.includes('FROM candidates')) return [{ id: CANDIDATE_ID }]
      if (sql.includes('MAX(photo_order)')) return [{ next_order: 2 }]
      if (sql.includes('INSERT INTO candidate_photos')) return [{ id: PHOTO_ID }]
      return []
    })
    const res = await addCandidatePhoto({ db: asDb(db) as unknown as Db }, CANDIDATE_ID, {
      blobId: BLOB_ID,
      caption: 'Robe wax',
    })
    expect(res.status).toBe(201)
    expect((res.body as Record<string, unknown>).id).toBe(PHOTO_ID)
  })
})
describe('removeCandidatePhoto', () => {
  it('supprime la photo et son blob', async () => {
    const db = recordingDb((sql) =>
      sql.includes('FROM candidate_photos') ? [{ storage_key: BLOB_ID }] : [],
    )
    const res = await removeCandidatePhoto({ db: asDb(db) as unknown as Db }, PHOTO_ID)
    expect(res.status).toBe(200)
    const sqls = db.calls.map((c) => c.sql).join(' | ')
    expect(sqls).toContain('DELETE FROM candidate_photos')
    expect(sqls).toContain('DELETE FROM photo_files')
  })
})
describe('createCandidate — catégorie', () => {
  it('refuse une création sans catégorie (400) sans insertion', async () => {
    const db = recordingDb([{ id: CANDIDATE_ID }])
    const res = await createCandidate(
      { db: asDb(db) as unknown as Db },
      { full_name: 'Awa Bocovo' },
    )
    expect(res.status).toBe(400)
    expect(db.calls.length).toBe(0)
  })

  it('refuse une catégorie hors liste (400)', async () => {
    const db = recordingDb([{ id: CANDIDATE_ID }])
    const res = await createCandidate(
      { db: asDb(db) as unknown as Db },
      { full_name: 'Awa Bocovo', category: 'autre' },
    )
    expect(res.status).toBe(400)
    expect(db.calls.length).toBe(0)
  })

  it('crée avec une catégorie valide et la transmet à l’INSERT', async () => {
    const db = recordingDb([{ id: CANDIDATE_ID }])
    const res = await createCandidate(
      { db: asDb(db) as unknown as Db },
      { full_name: 'Awa Bocovo', category: 'femme' },
    )
    expect(res.status).toBe(201)
    expect(db.calls[0]!.params).toContain('femme')
  })
})

describe('updateCandidate — catégorie', () => {
  it('refuse une catégorie invalide (400) sans update', async () => {
    const db = recordingDb([{ id: CANDIDATE_ID }])
    const res = await updateCandidate({ db: asDb(db) as unknown as Db }, CANDIDATE_ID, {
      full_name: 'Awa B.',
      category: 'x',
    })
    expect(res.status).toBe(400)
    expect(db.calls.length).toBe(0)
  })

  it('modifie la catégorie quand fournie', async () => {
    const db = recordingDb((sql) => (sql.includes('UPDATE') ? [{ id: CANDIDATE_ID }] : []))
    const res = await updateCandidate({ db: asDb(db) as unknown as Db }, CANDIDATE_ID, {
      full_name: 'Awa B.',
      category: 'homme',
    })
    expect(res.status).toBe(200)
    expect(db.calls[0]!.params).toContain('homme')
  })

  it('sans catégorie fournie, l’update passe (champ inchangé via COALESCE)', async () => {
    const db = recordingDb((sql) => (sql.includes('UPDATE') ? [{ id: CANDIDATE_ID }] : []))
    const res = await updateCandidate({ db: asDb(db) as unknown as Db }, CANDIDATE_ID, {
      full_name: 'Awa B.',
    })
    expect(res.status).toBe(200)
    expect(db.calls[0]!.sql).toContain('COALESCE')
  })
})
