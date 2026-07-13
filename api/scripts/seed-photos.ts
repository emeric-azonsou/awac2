import 'dotenv/config'
import postgres from 'postgres'

const CAPTIONS = [
  'Robe de cérémonie en tissu wax',
  'Ensemble deux-pièces sur mesure',
  'Tenue traditionnelle revisitée',
  'Veste brodée main',
  'Création libre — collection 2026',
]

const PHOTOS_PER_CANDIDATE = 4

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL manquant dans api/.env')
  process.exit(1)
}

const sql = postgres(connectionString, { ssl: 'require' })

const existing = await sql`SELECT count(*)::int AS count FROM candidate_photos`
const existingCount = existing[0]?.count ?? 0
if (existingCount > 0) {
  console.log(`candidate_photos non vide (${existingCount}) — seed ignoré`)
} else {
  const candidates = await sql`SELECT id, full_name FROM candidates ORDER BY created_at`
  let inserted = 0
  for (const [candidateIndex, candidate] of candidates.entries()) {
    for (let photoIndex = 0; photoIndex < PHOTOS_PER_CANDIDATE; photoIndex++) {
      const photoSeed = `awac-${candidateIndex}-${photoIndex}`
      await sql`
        INSERT INTO candidate_photos (candidate_id, photo_url, storage_key, caption, photo_order)
        VALUES (
          ${candidate.id},
          ${`https://picsum.photos/seed/${photoSeed}/900/1100`},
          ${`demo/${photoSeed}.jpg`},
          ${CAPTIONS[photoIndex % CAPTIONS.length] ?? ''},
          ${photoIndex + 1}
        )`
      inserted++
    }
  }
  console.log(`${inserted} photos de démo insérées pour ${candidates.length} candidats`)
}
await sql.end()
