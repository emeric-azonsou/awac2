import type { Db } from '../../server/types'

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
    return Promise.resolve(
      typeof result === 'function' ? result(strings.join('?'), params) : result,
    )
  }) as RecordingDb
  db.calls = calls
  db.begin = (fn) => fn(db)
  return db
}

export const asDb = (db: unknown): Db => db as unknown as Db
