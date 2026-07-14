import type { H3Event } from 'h3'
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
  const secret = useRuntimeConfig().sessionSecret
  if (!secret || secret.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SESSION_SECRET manquant ou trop court (32 caractères minimum)',
    })
  }
  return secret
}
export function getAdminSession(event: H3Event) {
  return useSession<AdminSessionData>(event, {
    name: SESSION_NAME,
    password: sessionPassword(),
    maxAge: SESSION_MAX_AGE_SECONDS,
    cookie: { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev },
  })
}
const UNAUTHORIZED = () =>
  createError({ statusCode: 401, statusMessage: 'Authentification requise' })
export async function requireAdminSession(event: H3Event): Promise<Required<AdminSessionData>> {
  const session = await getAdminSession(event)
  const { adminId, email, fullName, tokenVersion } = session.data
  if (!adminId) throw UNAUTHORIZED()

  const rows = await getDb()`SELECT token_version FROM admins WHERE id = ${adminId}`
  const currentVersion = rows[0] ? Number(rows[0].token_version) : null
  if (currentVersion === null || currentVersion !== (tokenVersion ?? 0)) {
    throw UNAUTHORIZED()
  }
  return { adminId, email: email ?? '', fullName: fullName ?? '', tokenVersion: tokenVersion ?? 0 }
}
