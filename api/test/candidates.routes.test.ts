import { describe, it, expect } from 'vitest'
import { buildTestApp, recordingDb, readJson } from './helpers.ts'
import candidatesRouter from '../src/routes/candidates.ts'

describe('candidates public routes', () => {
  it('GET /candidates renvoie la liste publique triée par votes', async () => {
    const db = recordingDb([
      { id: 'c1', full_name: 'Awa B', atelier: 'Atelier X', commune: 'Lokossa', profile_photo_url: null, vote_count: 12 },
      { id: 'c2', full_name: 'Kofi D', atelier: null, commune: 'Comè', profile_photo_url: 'https://img/x.jpg', vote_count: 3 },
    ])
    const app = buildTestApp({ db }, (a) => a.route('/candidates', candidatesRouter))
    const res = await app.request('/candidates')
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body).toHaveLength(2)
    expect(body[0]).toEqual({
      id: 'c1', full_name: 'Awa B', atelier: 'Atelier X', commune: 'Lokossa', profile_photo_url: null, vote_count: 12,
    })
    expect(db.calls[0]!.sql).toContain('ORDER BY vote_count DESC')
  })

  it('GET /candidates/:id renvoie le candidat avec ses photos', async () => {
    const candidateId = '6a3c0e1f-2b4d-4f5a-9c8e-1d2f3a4b5c6d'
    const db = recordingDb((sql) => {
      if (sql.includes('FROM candidate_photos')) {
        return [{ id: 'p1', photo_url: 'https://img/1.jpg', caption: null, photo_order: 1 }]
      }
      return [{ id: candidateId, full_name: 'Awa B', atelier: null, commune: null, profile_photo_url: null, vote_count: 0 }]
    })
    const app = buildTestApp({ db }, (a) => a.route('/candidates', candidatesRouter))
    const res = await app.request(`/candidates/${candidateId}`)
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.id).toBe(candidateId)
    expect(body.photos).toHaveLength(1)
  })

  it('GET /candidates/:id renvoie 404 si absent (uuid valide)', async () => {
    const db = recordingDb([])
    const app = buildTestApp({ db }, (a) => a.route('/candidates', candidatesRouter))
    const res = await app.request('/candidates/6a3c0e1f-2b4d-4f5a-9c8e-1d2f3a4b5c6d')
    expect(res.status).toBe(404)
    expect((await readJson(res)).error.code).toBe('not_found')
  })

  it('GET /candidates/:id renvoie 404 sans requête DB si id non-uuid', async () => {
    const db = recordingDb([])
    const app = buildTestApp({ db }, (a) => a.route('/candidates', candidatesRouter))
    const res = await app.request('/candidates/inconnu')
    expect(res.status).toBe(404)
    expect(db.calls).toHaveLength(0)
  })
})
