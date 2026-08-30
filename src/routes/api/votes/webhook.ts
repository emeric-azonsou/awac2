import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../../../server/lib/db'
import { getFeexpay, getFeexpayWebhookSecret } from '../../../../server/utils/context'
import { processWebhook } from '../../../../server/services/votes'
import { jsonResult, toErrorResponse } from '../../../../server/lib/httpResult'

export const Route = createFileRoute('/api/votes/webhook')({
  server: {
    handlers: {
      // La signature FeexPay est calculée sur le corps brut : le lire en texte
      // et le transmettre tel quel. Un JSON.parse suivi d'un re-stringify
      // invaliderait la signature de façon silencieuse.
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text()
          const queryToken = new URL(request.url).searchParams.get('token')
          const token = queryToken ? queryToken : null
          const result = await processWebhook(
            { db: getDb(), feexpay: getFeexpay(), secret: getFeexpayWebhookSecret() },
            rawBody,
            token,
          )
          return jsonResult(result)
        } catch (err) {
          return toErrorResponse(err)
        }
      },
    },
  },
})
