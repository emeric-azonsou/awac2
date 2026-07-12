import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getDb } from './db.js'
import candidatesRouter from './routes/candidates.js'
import votesRouter from './routes/votes.js'
import settingsRouter from './routes/settings.js'

export function createApp({ withDb = true } = {}) {
  const app = new Hono()

  app.use('*', cors())

  if (withDb) {
    app.use('*', async (c, next) => {
      c.set('db', getDb())
      await next()
    })
  }

  app.get('/health', (c) => c.json({ status: 'ok' }))

  app.route('/candidates', candidatesRouter)
  app.route('/votes', votesRouter)
  app.route('/settings', settingsRouter)

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Ressource introuvable' } }, 404))
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: { code: 'internal_error', message: 'Une erreur interne est survenue' } }, 500)
  })

  return app
}
