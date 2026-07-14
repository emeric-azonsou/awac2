import { describe, it, expect, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import {
  verifyAdminLogin,
  resetLoginThrottle,
  LOGIN_MAX_ATTEMPTS,
} from '../../server/services/admin/auth'
import { asDb } from './helpers'
import type { Db } from '../../server/types'

const ADMIN_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const PASSWORD = 'S3bpay!awac-2026'
const HASH = bcrypt.hashSync(PASSWORD, 10)

function makeDb({ adminExists = true } = {}) {
  const db = ((strings: TemplateStringsArray) => {
    const sql = strings.join('?')
    if (sql.includes('FROM admins')) {
      return Promise.resolve(
        adminExists
          ? [
              {
                id: ADMIN_ID,
                email: 'admin@awac.bj',
                password_hash: HASH,
                full_name: 'Emeric',
                token_version: 3,
              },
            ]
          : [],
      )
    }
    return Promise.resolve([])
  }) as unknown as Db
  return db
}

const CLIENT_IP = '203.0.113.7'

beforeEach(() => resetLoginThrottle())

describe('verifyAdminLogin', () => {
  it('accepte email + mot de passe valides et renvoie le profil sans hash', async () => {
    const res = await verifyAdminLogin(
      { db: asDb(makeDb()) as unknown as Db },
      { email: 'admin@awac.bj', password: PASSWORD, clientIp: CLIENT_IP },
    )
    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    expect(body.id).toBe(ADMIN_ID)
    expect(body.email).toBe('admin@awac.bj')
    expect(body.full_name).toBe('Emeric')
    expect(body.token_version).toBe(3)
    expect(JSON.stringify(body)).not.toContain(HASH)
  })

  it('refuse un mauvais mot de passe (401, message générique)', async () => {
    const res = await verifyAdminLogin(
      { db: asDb(makeDb()) as unknown as Db },
      { email: 'admin@awac.bj', password: 'mauvais', clientIp: CLIENT_IP },
    )
    expect(res.status).toBe(401)
  })

  it('refuse un email inconnu avec la même erreur générique (pas d’énumération)', async () => {
    const known = await verifyAdminLogin(
      { db: asDb(makeDb()) as unknown as Db },
      { email: 'admin@awac.bj', password: 'mauvais', clientIp: CLIENT_IP },
    )
    const unknown = await verifyAdminLogin(
      { db: asDb(makeDb({ adminExists: false })) as unknown as Db },
      { email: 'inconnu@awac.bj', password: 'mauvais', clientIp: CLIENT_IP },
    )
    expect(unknown.status).toBe(401)
    expect(unknown.body).toEqual(known.body)
  })

  it('refuse les entrées vides (400) sans requête en base', async () => {
    let queried = false
    const db = ((strings: TemplateStringsArray) => {
      queried = Boolean(strings)
      return Promise.resolve([])
    }) as unknown as Db
    const res = await verifyAdminLogin({ db }, { email: '', password: '', clientIp: CLIENT_IP })
    expect(res.status).toBe(400)
    expect(queried).toBe(false)
  })

  it('verrouille après trop d’échecs, même avec le bon mot de passe ensuite (429)', async () => {
    const db = asDb(makeDb()) as unknown as Db
    for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS; attempt += 1) {
      await verifyAdminLogin(
        { db },
        { email: 'admin@awac.bj', password: 'mauvais', clientIp: CLIENT_IP },
      )
    }
    const locked = await verifyAdminLogin(
      { db },
      { email: 'admin@awac.bj', password: PASSWORD, clientIp: CLIENT_IP },
    )
    expect(locked.status).toBe(429)
  })

  it('un login réussi remet le compteur d’échecs à zéro', async () => {
    const db = asDb(makeDb()) as unknown as Db
    for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS - 1; attempt += 1) {
      await verifyAdminLogin(
        { db },
        { email: 'admin@awac.bj', password: 'mauvais', clientIp: CLIENT_IP },
      )
    }
    const success = await verifyAdminLogin(
      { db },
      { email: 'admin@awac.bj', password: PASSWORD, clientIp: CLIENT_IP },
    )
    expect(success.status).toBe(200)
    const failAgain = await verifyAdminLogin(
      { db },
      { email: 'admin@awac.bj', password: 'mauvais', clientIp: CLIENT_IP },
    )
    expect(failAgain.status).toBe(401)
  })

  it('le verrou d’une IP ne bloque pas une autre IP', async () => {
    const db = asDb(makeDb()) as unknown as Db
    for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS; attempt += 1) {
      await verifyAdminLogin(
        { db },
        { email: 'admin@awac.bj', password: 'mauvais', clientIp: CLIENT_IP },
      )
    }
    const otherIp = await verifyAdminLogin(
      { db },
      { email: 'admin@awac.bj', password: PASSWORD, clientIp: '198.51.100.9' },
    )
    expect(otherIp.status).toBe(200)
  })
})
