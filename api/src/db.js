import postgres from 'postgres'

let client = null

export function getDb() {
  if (client) return client
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL manquant (.env)')
  client = postgres(connectionString, { ssl: 'require' })
  return client
}
