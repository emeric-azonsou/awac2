import { requireAdminSession } from '../../lib/adminSession'

export default defineEventHandler(async (event) => {
  const admin = await requireAdminSession(event)
  return { id: admin.adminId, email: admin.email, full_name: admin.fullName }
})
