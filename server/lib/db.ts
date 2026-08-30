import postgres from 'postgres'
import type { Db } from '../types'
let client: Db | null = null
export function getDb(): Db {
  if (client) return client
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL manquant (.env)')
  client = postgres(connectionString, { ssl: 'require' })
  return client
}
