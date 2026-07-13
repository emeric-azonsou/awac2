import 'dotenv/config'
import postgres from 'postgres'

const CANDIDATES = [
  { full_name: 'Awa Bocovo', atelier: 'Atelier Élégance', commune: 'Lokossa' },
  { full_name: 'Kofi Dossou', atelier: 'Couture Royale', commune: 'Comè' },
  { full_name: 'Chantal Hounsou', atelier: 'Fils & Merveilles', commune: 'Athiémé' },
  { full_name: 'Rodrigue Agbo', atelier: 'Mode Créative', commune: 'Grand-Popo' },
  { full_name: 'Estelle Kponou', atelier: 'Aiguille d’Or', commune: 'Bopa' },
  { full_name: 'Marcellin Todan', atelier: 'Style du Mono', commune: 'Houéyogbé' },
]

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL manquant dans api/.env')
  process.exit(1)
}

const sql = postgres(connectionString, { ssl: 'require' })

const existing = await sql`SELECT count(*)::int AS count FROM candidates`
const existingCount = existing[0]?.count ?? 0
if (existingCount > 0) {
  console.log(`candidates non vide (${existingCount}) — seed ignoré`)
} else {
  for (const candidate of CANDIDATES) {
    await sql`INSERT INTO candidates ${sql(candidate)}`
  }
  console.log(`${CANDIDATES.length} candidats de démo insérés`)
}
await sql.end()
