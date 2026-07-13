import { Hono } from 'hono'

export function buildTestApp(fakes = {}, mount = () => {}) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('db', fakes.db)
    c.set('jwtSecret', fakes.jwtSecret ?? 'test-secret')
    c.set('sebpay', fakes.sebpay ?? null)
    c.set('sebpaySecret', fakes.sebpaySecret ?? 'sk_test_xyz')
    c.set('paymentConfig', fakes.paymentConfig ?? { callbackUrl: 'https://awac.test/votes/webhook' })
    await next()
  })
  mount(app)
  app.onError((err, c) =>
    c.json({ error: { code: 'internal_error', message: 'Une erreur interne est survenue' } }, 500),
  )
  return app
}

export function recordingDb(result = []) {
  const calls = []
  const db = (strings, ...params) => {
    calls.push({ sql: strings.join('?'), params })
    return Promise.resolve(typeof result === 'function' ? result(strings.join('?'), params) : result)
  }
  db.calls = calls
  db.begin = (fn) => fn(db)
  return db
}
