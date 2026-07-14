import { getDb } from '../../lib/db'
import { getAdminSession } from '../../lib/adminSession'
export default defineEventHandler(async (event) => {
  const session = await getAdminSession(event)
  const adminId = session.data.adminId

  if (adminId) {
    await getDb()`UPDATE admins SET token_version = token_version + 1 WHERE id = ${adminId}`
  }
  await session.clear()
  return { ok: true }
})
