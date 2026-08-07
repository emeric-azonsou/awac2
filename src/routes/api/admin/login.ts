import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { getAdminSession } from '../../../../server/lib/adminSession'
import { verifyAdminLogin, type AdminProfile } from '../../../../server/services/admin/auth'
import {
  clientIpFrom,
  jsonResult,
  readJsonBody,
  toErrorResponse,
} from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/admin/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody(request)
          const result = await verifyAdminLogin(
            { db: getDb() },
            {
              email: typeof body.email === 'string' ? body.email : '',
              password: typeof body.password === 'string' ? body.password : '',
              clientIp: clientIpFrom(request),
            },
          )
          if (result.status === 200) {
            const admin = result.body as AdminProfile
            const session = await getAdminSession()
            await session.update({
              adminId: admin.id,
              email: admin.email,
              fullName: admin.full_name,
              tokenVersion: admin.token_version,
            })
          }
          return jsonResult(result)
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
