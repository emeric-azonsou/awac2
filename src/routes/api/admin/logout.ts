import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { getAdminSession } from '../../../../server/lib/adminSession'
import { toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/admin/logout')({
  server: {
    handlers: {
      // L'incrémentation de token_version invalide toutes les sessions déjà
      // scellées de cet admin, pas seulement le cookie du navigateur courant.
      POST: async () => {
        try {
          const session = await getAdminSession()
          const adminId = session.data.adminId
          if (adminId) {
            await getDb()`UPDATE admins SET token_version = token_version + 1 WHERE id = ${adminId}`
          }
          await session.clear()
          return Response.json({ ok: true })
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
