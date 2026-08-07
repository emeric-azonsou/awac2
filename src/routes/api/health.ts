import { createFileRoute } from '@tanstack/react-router'
import { getFeexpay } from '../../../server/utils/context'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => Response.json({ status: 'ok', payment: getFeexpay() ? 'feexpay' : 'simulated' }),
    },
  },
})
