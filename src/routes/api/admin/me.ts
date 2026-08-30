import { createFileRoute } from '@tanstack/react-router'
import { requireAdminSession } from '../../../../server/lib/adminSession'
import { toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/admin/me')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await requireAdminSession()
          return Response.json({
            id: admin.adminId,
            email: admin.email,
            full_name: admin.fullName,
          })
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
