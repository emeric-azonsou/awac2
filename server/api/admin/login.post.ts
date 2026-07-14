import { getDb } from '../../lib/db'
import { getAdminSession } from '../../lib/adminSession'
import { verifyAdminLogin, type AdminProfile } from '../../services/admin/auth'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const clientIp = getRequestIP(event, { xForwardedFor: true }) ?? 'ip-inconnue'

  const result = await verifyAdminLogin(
    { db: getDb() },
    {
      email: typeof body.email === 'string' ? body.email : '',
      password: typeof body.password === 'string' ? body.password : '',
      clientIp,
    },
  )

  if (result.status === 200) {
    const admin = result.body as AdminProfile
    const session = await getAdminSession(event)
    await session.update({ adminId: admin.id, email: admin.email, fullName: admin.full_name })
  }

  setResponseStatus(event, result.status)
  return result.body
})
