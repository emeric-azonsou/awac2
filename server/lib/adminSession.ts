import { useSession } from '@tanstack/react-start/server'
import { getDb } from './db'

const SESSION_NAME = 'awac_admin'
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60

export interface AdminSessionData {
  adminId?: string
  email?: string
  fullName?: string
  tokenVersion?: number
}

function sessionPassword(): string {
  const secret = process.env.SESSION_SECRET ?? ''
  if (!secret || secret.length < 32) {
    throw Object.assign(
      new Error('SESSION_SECRET manquant ou trop court (32 caractères minimum)'),
      { status: 500, code: 'internal_error' },
    )
  }
  return secret
}

export function getAdminSession() {
  return useSession<AdminSessionData>({
    name: SESSION_NAME,
    password: sessionPassword(),
    maxAge: SESSION_MAX_AGE_SECONDS,
    cookie: { httpOnly: true, sameSite: 'lax', secure: !import.meta.env.DEV },
  })
}

const UNAUTHORIZED = () =>
  Object.assign(new Error('Authentification requise'), {
    status: 401,
    code: 'unauthorized',
  })

// token_version est incrémenté à la déconnexion : une session scellée avant
// cette incrémentation reste déchiffrable mais doit être refusée.
export async function requireAdminSession(): Promise<Required<AdminSessionData>> {
  const session = await getAdminSession()
  const { adminId, email, fullName, tokenVersion } = session.data
  if (!adminId) throw UNAUTHORIZED()

  const rows = await getDb()`SELECT token_version FROM admins WHERE id = ${adminId}`
  const currentVersion = rows[0] ? Number(rows[0].token_version) : null
  if (currentVersion === null || currentVersion !== (tokenVersion ?? 0)) {
    throw UNAUTHORIZED()
  }
  return { adminId, email: email ?? '', fullName: fullName ?? '', tokenVersion: tokenVersion ?? 0 }
}
