import { readFileSync } from 'node:fs'
import bcrypt from 'bcryptjs'
import postgres from 'postgres'
const [email, password, fullName = 'Admin AWAC'] = process.argv.slice(2)
if (!email || !password) {
  console.error('Usage : node scripts/create-admin.mjs <email> <mot-de-passe> [nom complet]')
  process.exit(1)
}
if (password.length < 10) {
  console.error('Mot de passe trop court : 10 caractères minimum.')
  process.exit(1)
}
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => [
      line.slice(0, line.indexOf('=')),
      line
        .slice(line.indexOf('=') + 1)
        .trim()
        .replace(/^"|"$/g, ''),
    ]),
)
const sql = postgres(process.env.DATABASE_URL || env.DATABASE_URL, { prepare: false })
const passwordHash = bcrypt.hashSync(password, 12)
const rows = await sql`
  INSERT INTO admins (email, password_hash, full_name)
  VALUES (${email.toLowerCase()}, ${passwordHash}, ${fullName})
  ON CONFLICT (email) DO UPDATE
  SET password_hash = ${passwordHash}, full_name = ${fullName}
  RETURNING id, email`
console.log(`Admin prêt : ${rows[0].email} (${rows[0].id})`)
await sql.end()
