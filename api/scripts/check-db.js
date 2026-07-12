import 'dotenv/config'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL manquant dans api/.env')
  process.exit(1)
}

const sql = postgres(connectionString, { ssl: 'require' })

try {
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name`
  console.log(`Connecté à Neon. ${tables.length} tables :`)
  console.log(tables.map((t) => t.table_name).join(', '))
} catch (err) {
  console.error('Échec connexion Neon :', err.message)
  process.exit(1)
} finally {
  await sql.end()
}
