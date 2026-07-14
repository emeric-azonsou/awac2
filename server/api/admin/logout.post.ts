import { getDb } from '../../lib/db'
import { getAdminSession } from '../../lib/adminSession'

export default defineEventHandler(async (event) => {
  const session = await getAdminSession(event)
  const adminId = session.data.adminId
  // Incrémente token_version : révoque immédiatement, côté serveur, tout token
  // encore valide de cet admin (le clear() ne retirait le cookie que du navigateur).
  if (adminId) {
    await getDb()`UPDATE admins SET token_version = token_version + 1 WHERE id = ${adminId}`
  }
  await session.clear()
  return { ok: true }
})
