// Session admin : cookie scellé httpOnly (h3 useSession). Le cookie ne contient
// que l'identité minimale (id, email, nom) chiffrée avec SESSION_SECRET.
import type { H3Event } from 'h3'

const SESSION_NAME = 'awac_admin'
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60

export interface AdminSessionData {
  adminId?: string
  email?: string
  fullName?: string
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

export async function requireAdminSession(event: H3Event): Promise<Required<AdminSessionData>> {
  const session = await getAdminSession(event)
  const { adminId, email, fullName } = session.data
  if (!adminId) {
    throw createError({ statusCode: 401, statusMessage: 'Authentification requise' })
  }
  return { adminId, email: email ?? '', fullName: fullName ?? '' }
}
