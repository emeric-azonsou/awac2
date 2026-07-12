import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getDb } from './db.js'

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

  app.get('/db-check', async (c) => {
    const db = c.get('db')
    const rows = await db`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    return c.json({ connected: true, tables: rows.map((r) => r.table_name) })
  })

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Ressource introuvable' } }, 404))
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: { code: 'internal_error', message: 'Une erreur interne est survenue' } }, 500)
  })

  return app
}
