import { describe, it, expect } from 'vitest'
import { recordingDb, asDb } from './helpers'
import { isUuid, listCandidates, getCandidateWithPhotos } from '../../server/services/candidates'
const CANDIDATE_ID = '6a3c0e1f-2b4d-4f5a-9c8e-1d2f3a4b5c6d'
describe('isUuid', () => {
  it('valide un uuid, rejette le reste', () => {
    expect(isUuid(CANDIDATE_ID)).toBe(true)
    expect(isUuid('pas-uuid')).toBe(false)
    expect(isUuid(42)).toBe(false)
  })
})
describe('listCandidates', () => {
  it('renvoie la liste triée par votes (200)', async () => {
    const db = recordingDb([
      {
        id: 'c1',
        full_name: 'Awa B',
        atelier: 'X',
        commune: 'Lokossa',
        profile_photo_url: null,
        vote_count: 12,
      },
    ])
    const res = await listCandidates(asDb(db))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(db.calls[0]!.sql).toContain('ORDER BY vote_count DESC')
  })
})
describe('getCandidateWithPhotos', () => {
  it('renvoie candidat + photos (200)', async () => {
    const db = recordingDb((sql) =>
      sql.includes('FROM candidate_photos')
        ? [{ id: 'p1', photo_url: 'https://img/1.jpg', caption: null, photo_order: 1 }]
        : [
            {
              id: CANDIDATE_ID,
              full_name: 'Awa B',
              atelier: null,
              commune: null,
              profile_photo_url: null,
              vote_count: 0,
            },
          ],
    )
    const res = await getCandidateWithPhotos(asDb(db), CANDIDATE_ID)
    expect(res.status).toBe(200)
    expect((res.body as { photos: unknown[] }).photos).toHaveLength(1)
  })
  it('renvoie 404 si id non-uuid, sans requête DB', async () => {
    const db = recordingDb([])
    const res = await getCandidateWithPhotos(asDb(db), 'inconnu')
    expect(res.status).toBe(404)
    expect(db.calls).toHaveLength(0)
  })
  it('renvoie 404 si candidat absent', async () => {
    const db = recordingDb([])
    const res = await getCandidateWithPhotos(asDb(db), CANDIDATE_ID)
    expect(res.status).toBe(404)
  })
})
