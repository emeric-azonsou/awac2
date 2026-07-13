import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './types'
import { getDb } from './db.ts'
import { createSebpayFromEnv } from './lib/sebpay.ts'
import candidatesRouter from './routes/candidates.ts'
import votesRouter from './routes/votes.ts'
import settingsRouter from './routes/settings.ts'
import paymentRouter from './routes/payment.ts'

export function createApp({ withDb = true } = {}) {
  const app = new Hono<AppEnv>()

  app.use('*', cors())

  const sebpay = createSebpayFromEnv()
  const paymentConfig = { callbackUrl: process.env.SEBPAY_CALLBACK_URL || '' }

  app.use('*', async (c, next) => {
    if (withDb) c.set('db', getDb())
    c.set('sebpay', sebpay)
    c.set('sebpaySecret', process.env.SEBPAY_SECRET_KEY || '')
    c.set('paymentConfig', paymentConfig)
    await next()
  })

  app.get('/health', (c) => c.json({ status: 'ok', payment: sebpay ? 'sebpay' : 'simulated' }))

  app.route('/candidates', candidatesRouter)
  app.route('/votes', votesRouter)
  app.route('/settings', settingsRouter)
  app.route('/payment', paymentRouter)

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Ressource introuvable' } }, 404))
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: { code: 'internal_error', message: 'Une erreur interne est survenue' } }, 500)
  })

  return app
}
