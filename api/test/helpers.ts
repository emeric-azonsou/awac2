import { Hono } from 'hono'
import type { AppEnv, Db, SebpayClient, PaymentConfig } from '../src/types'

interface Fakes {
  db?: unknown
  sebpay?: SebpayClient | null
  sebpaySecret?: string
  paymentConfig?: PaymentConfig
}

export function buildTestApp(fakes: Fakes = {}, mount: (app: Hono<AppEnv>) => void = () => {}) {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('db', fakes.db as Db)
    c.set('sebpay', fakes.sebpay ?? null)
    c.set('sebpaySecret', fakes.sebpaySecret ?? 'sk_test_xyz')
    c.set('paymentConfig', fakes.paymentConfig ?? { callbackUrl: 'https://awac.test/votes/webhook' })
    await next()
  })
  mount(app)
  app.onError((_err, c) =>
    c.json({ error: { code: 'internal_error', message: 'Une erreur interne est survenue' } }, 500),
  )
  return app
}

// Réponses JSON de test : corps dynamique, typage permissif localisé aux tests.
// biome-ignore lint/suspicious/noExplicitAny: dynamic test JSON payloads
export function readJson(res: Response): Promise<any> {
  return res.json()
}

type QueryResult = unknown[]
type ResultFactory = (sql: string, params: unknown[]) => QueryResult

export interface RecordingDb {
  (strings: TemplateStringsArray, ...params: unknown[]): Promise<QueryResult>
  calls: { sql: string; params: unknown[] }[]
  begin: (fn: (db: RecordingDb) => unknown) => unknown
}

export function recordingDb(result: QueryResult | ResultFactory = []): RecordingDb {
  const calls: { sql: string; params: unknown[] }[] = []
  const db = ((strings: TemplateStringsArray, ...params: unknown[]) => {
    calls.push({ sql: strings.join('?'), params })
    return Promise.resolve(typeof result === 'function' ? result(strings.join('?'), params) : result)
  }) as RecordingDb
  db.calls = calls
  db.begin = (fn) => fn(db)
  return db
}
