# Migration awac → Neon + Cloudflare Workers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠️ PIVOT DE STACK (2026-07-12, décision utilisateur)** : le backend est finalement **Node/Hono déployé sur Railway** (pas Cloudflare Workers) + **Cloudinary** pour les photos (pas R2). Substitutions à appliquer sur toutes les tâches :
> - `wrangler` / workerd → `@hono/node-server` (`node --watch src/server.js`), déjà en place.
> - `@neondatabase/serverless` → driver `postgres` (déjà en place, `src/db.js`).
> - PBKDF2 Web Crypto → **bcryptjs** (pas de budget CPU 10ms sur Railway) ; format stocké = hash bcrypt standard.
> - `jose` → **jsonwebtoken** (HS256, `{ sub, role }`, 7 jours — inchangé).
> - R2 binding / `R2_PUBLIC_URL` → **Cloudinary** (`CLOUDINARY_URL` en env) ; upload/delete via SDK, URLs servies par Cloudinary CDN.
> - `.dev.vars` → `api/.env` (gitignoré, déjà en place).
> - Le schéma SQL (Task 5) est **déjà appliqué** sur Neon (10 tables). Reste à committer le fichier de migration de référence.
> - Task 1 (scaffold + health) : **déjà faite** (commit 3298871).

**Goal:** Build a Cloudflare Worker API (Hono) backed by Neon Postgres and Cloudflare R2 that replaces Supabase for the awac couturier voting contest, plus rewire the Vue SPA's data/auth layer to talk to it — delivering a working end-to-end slice (admin login → dashboard aggregates; jury login → submit evaluation; public → cast a paid vote).

**Architecture:** A standalone `api/` workspace holds a Hono app deployed to Cloudflare Workers. Route handlers read their dependencies (`db`, `r2`, `jwtSecret`) from Hono's request context, which a single context-middleware populates from `c.env` in production and which tests populate with fakes — so every route is unit-testable without a live database or the workerd runtime. Pure security-critical units (password hashing, JWT, ranking math) are plain ES modules tested with vanilla Vitest. The Vue SPA keeps living on Vercel and calls the Worker over HTTPS with a bearer JWT.

**Tech Stack:** Hono (Worker framework), `@neondatabase/serverless` (HTTP Postgres driver), `jose` (JWT via Web Crypto), Web Crypto `crypto.subtle` PBKDF2 (password hashing), Cloudflare R2 (photo storage), Wrangler (Worker tooling), Vitest (tests), `pg` (dev-only, migration runner). Frontend: existing Vue 3 / Vite / Pinia / vue-router.

## Global Constraints

- **Node engine (SPA package):** `^22.18.0 || >=24.12.0` — do not lower it.
- **Worker CPU budget:** 10 ms/request (Cloudflare free plan). No bcrypt/scrypt-in-JS on the request path. Password hashing uses **PBKDF2 via Web Crypto** only.
- **Password hashing:** PBKDF2-HMAC-SHA-256, **210 000 iterations**, 16-byte random salt, 32-byte derived key, stored as `pbkdf2$<iterations>$<saltB64>$<hashB64>`. Verification is constant-time.
- **JWT:** HS256, payload `{ sub, role }`, `role` ∈ `{ "admin", "jury" }`, expiry **7 days**. Secret from env `JWT_SECRET`, never hardcoded.
- **Secrets:** `DATABASE_URL`, `JWT_SECRET`, `R2_PUBLIC_URL` live in `api/.dev.vars` locally (gitignored) and as Wrangler secrets/vars in production. Never commit a real value. `.env`-style files must be gitignored.
- **Error shape:** every error response is `{ "error": { "code": string, "message": string } }`. Never leak stack traces or raw Postgres messages to the client.
- **Money:** amounts stored in the smallest currency unit is NOT used here — store `unit_price` and `total_amount` as integers of the base currency (XOF has no minor unit). Default currency `"XOF"`.
- **Language:** all user-facing `message` strings in French.
- **R2 serving:** candidate images are served from the **R2 public bucket URL** (`R2_PUBLIC_URL`), never proxied through the Worker, to protect the request budget. The Worker only handles upload and delete.
- **Ranking:** computed on read, never stored. Formula per spec §"Classement combiné".

---

## File Structure

```
awac/
├── api/                              # NEW — Cloudflare Worker workspace
│   ├── package.json
│   ├── wrangler.toml
│   ├── vitest.config.js
│   ├── .dev.vars.example             # committed template
│   ├── .gitignore                    # ignores .dev.vars, node_modules
│   ├── migrations/
│   │   └── 0001_initial_schema.sql
│   ├── scripts/
│   │   └── migrate.js                # dev-only, runs SQL files via `pg`
│   ├── src/
│   │   ├── index.js                  # prod entry: build app from c.env
│   │   ├── app.js                    # createApp() — mounts routers, CORS
│   │   ├── db.js                     # neon client factory
│   │   ├── lib/
│   │   │   ├── errors.js             # uniform error helpers
│   │   │   ├── password.js           # PBKDF2 hash/verify
│   │   │   ├── jwt.js                # sign/verify JWT
│   │   │   └── scoring.js            # combined ranking (pure)
│   │   ├── middleware/
│   │   │   ├── context.js            # inject db/r2/jwtSecret from c.env
│   │   │   └── auth.js               # requireRole guard
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── candidates.js
│   │       ├── photos.js
│   │       ├── criteria.js
│   │       ├── evaluations.js
│   │       ├── votes.js
│   │       ├── settings.js
│   │       └── dashboard.js
│   └── test/
│       ├── helpers.js                # buildTestApp(fakes)
│       ├── password.test.js
│       ├── jwt.test.js
│       ├── scoring.test.js
│       ├── auth.routes.test.js
│       ├── candidates.routes.test.js
│       ├── criteria.routes.test.js
│       ├── evaluations.routes.test.js
│       ├── votes.routes.test.js
│       ├── settings.routes.test.js
│       └── dashboard.routes.test.js
└── src/                              # EXISTING Vue SPA
    ├── services/
    │   ├── api.js                    # NEW — fetch client (bearer token)
    │   ├── authService.js            # MODIFY — call /auth/login
    │   └── supabase.js               # DELETE
    ├── stores/userStore.js           # MODIFY — use api client
    ├── router/index.js               # MODIFY — guard uses api/JWT
    └── test-supabase.js              # DELETE
```

Follow-on plans (out of scope here): rebuilding the individual admin feature screens (`src/views/admin/*`) and jury screens (`src/views/jury/*`) against the new schema. This plan delivers the API, schema, storage, and the auth/data layer needed for those screens to be built next.

---

## Task 1: Scaffold the API workspace with a health endpoint

**Files:**
- Create: `api/package.json`
- Create: `api/wrangler.toml`
- Create: `api/vitest.config.js`
- Create: `api/.gitignore`
- Create: `api/.dev.vars.example`
- Create: `api/src/app.js`
- Create: `api/src/index.js`
- Create: `api/test/helpers.js`
- Test: `api/test/health.test.js`

**Interfaces:**
- Produces: `createApp()` → returns a Hono app instance with `GET /health` mounted. Later tasks add routers to this same factory.
- Produces: `buildTestApp(fakes)` in `test/helpers.js` → returns a Hono app with a middleware that sets `c.set('db', fakes.db)`, `c.set('r2', fakes.r2)`, `c.set('jwtSecret', fakes.jwtSecret ?? 'test-secret')` before mounting routers; used by every route test.

- [ ] **Step 1: Create the workspace manifest and config**

`api/package.json`:
```json
{
  "name": "awac-api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "migrate": "node scripts/migrate.js"
  },
  "dependencies": {
    "hono": "^4.6.14",
    "@neondatabase/serverless": "^0.10.4",
    "jose": "^5.9.6"
  },
  "devDependencies": {
    "wrangler": "^3.99.0",
    "vitest": "^2.1.8",
    "pg": "^8.13.1"
  }
}
```

`api/wrangler.toml`:
```toml
name = "awac-api"
main = "src/index.js"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# Vars (non-secret) — set real values via dashboard or `wrangler deploy --var`
[vars]
R2_PUBLIC_URL = "https://REPLACE_ME.r2.dev"

# R2 binding — bucket created in Task 10 prerequisites
[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "awac-photos"

# Secrets (DATABASE_URL, JWT_SECRET) are set with `wrangler secret put`, never in this file.
```

`api/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
})
```

`api/.gitignore`:
```
node_modules
.dev.vars
.wrangler
```

`api/.dev.vars.example`:
```
DATABASE_URL="postgresql://user:password@ep-xxx.eu-west-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="generate-a-long-random-string"
R2_PUBLIC_URL="https://REPLACE_ME.r2.dev"
```

- [ ] **Step 2: Create the app factory with the health route**

`api/src/app.js`:
```js
import { Hono } from 'hono'

export function createApp() {
  const app = new Hono()

  app.get('/health', (c) => c.json({ status: 'ok' }))

  return app
}
```

`api/src/index.js`:
```js
import { createApp } from './app.js'

const app = createApp()

export default app
```

- [ ] **Step 3: Create the test helper**

`api/test/helpers.js`:
```js
import { Hono } from 'hono'

// Builds a Hono app that injects fake dependencies into context,
// then mounts the provided routers. Each router reads db/r2/jwtSecret
// from context, so no live database or workerd runtime is needed.
export function buildTestApp(fakes = {}, mount = () => {}) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('db', fakes.db ?? null)
    c.set('r2', fakes.r2 ?? null)
    c.set('jwtSecret', fakes.jwtSecret ?? 'test-secret')
    await next()
  })
  mount(app)
  return app
}
```

- [ ] **Step 4: Write the failing health test**

`api/test/health.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { createApp } from '../src/app.js'

describe('GET /health', () => {
  it('returns ok', async () => {
    const app = createApp()
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 5: Install deps and run the test to verify it passes**

Run:
```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npm install && npm test
```
Expected: `health.test.js` passes (1 passed).

- [ ] **Step 6: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/package.json api/package-lock.json api/wrangler.toml api/vitest.config.js api/.gitignore api/.dev.vars.example api/src/app.js api/src/index.js api/test/helpers.js api/test/health.test.js
git commit -m "feat(api): scaffold Cloudflare Worker workspace with health endpoint"
```

---

## Task 2: Uniform error helpers

**Files:**
- Create: `api/src/lib/errors.js`
- Test: `api/test/errors.test.js`

**Interfaces:**
- Produces: `errorResponse(c, status, code, message)` → returns `c.json({ error: { code, message } }, status)`.
- Produces: `ERRORS` — a frozen map of reusable `{ status, code, message }` entries used across routes (e.g. `ERRORS.UNAUTHORIZED`, `ERRORS.FORBIDDEN`, `ERRORS.INVALID_CREDENTIALS`, `ERRORS.NOT_FOUND`, `ERRORS.VALIDATION`).
- Produces: `sendError(c, entry, messageOverride?)` → convenience wrapper around `errorResponse` taking an `ERRORS` entry.

- [ ] **Step 1: Write the failing test**

`api/test/errors.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { errorResponse, sendError, ERRORS } from '../src/lib/errors.js'

describe('error helpers', () => {
  it('errorResponse shapes the body and status', async () => {
    const app = new Hono()
    app.get('/x', (c) => errorResponse(c, 400, 'bad_input', 'Champ invalide'))
    const res = await app.request('/x')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: { code: 'bad_input', message: 'Champ invalide' } })
  })

  it('sendError uses an ERRORS entry', async () => {
    const app = new Hono()
    app.get('/y', (c) => sendError(c, ERRORS.INVALID_CREDENTIALS))
    const res = await app.request('/y')
    expect(res.status).toBe(401)
    expect((await res.json()).error.code).toBe('invalid_credentials')
  })

  it('sendError allows overriding the message', async () => {
    const app = new Hono()
    app.get('/z', (c) => sendError(c, ERRORS.VALIDATION, 'La somme doit valoir 100'))
    const res = await app.request('/z')
    expect(await res.json()).toEqual({ error: { code: 'validation_error', message: 'La somme doit valoir 100' } })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/errors.test.js`
Expected: FAIL — cannot find module `../src/lib/errors.js`.

- [ ] **Step 3: Implement the helpers**

`api/src/lib/errors.js`:
```js
export function errorResponse(c, status, code, message) {
  return c.json({ error: { code, message } }, status)
}

export const ERRORS = Object.freeze({
  UNAUTHORIZED: { status: 401, code: 'unauthorized', message: 'Authentification requise' },
  INVALID_CREDENTIALS: { status: 401, code: 'invalid_credentials', message: 'Email ou mot de passe incorrect' },
  FORBIDDEN: { status: 403, code: 'forbidden', message: 'Accès refusé' },
  NOT_FOUND: { status: 404, code: 'not_found', message: 'Ressource introuvable' },
  VALIDATION: { status: 400, code: 'validation_error', message: 'Données invalides' },
  CONFLICT: { status: 409, code: 'conflict', message: 'Conflit' },
  LOCKED: { status: 409, code: 'locked', message: 'Ressource verrouillée' },
})

export function sendError(c, entry, messageOverride) {
  return errorResponse(c, entry.status, entry.code, messageOverride ?? entry.message)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/errors.test.js`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/lib/errors.js api/test/errors.test.js
git commit -m "feat(api): add uniform error response helpers"
```

---

## Task 3: Password hashing (PBKDF2 via Web Crypto)

**Files:**
- Create: `api/src/lib/password.js`
- Test: `api/test/password.test.js`

**Interfaces:**
- Produces: `async hashPassword(plain: string) → string` — returns `pbkdf2$210000$<saltB64>$<hashB64>`.
- Produces: `async verifyPassword(plain: string, stored: string) → boolean` — constant-time, returns `false` for malformed `stored`.

- [ ] **Step 1: Write the failing test**

`api/test/password.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../src/lib/password.js'

describe('password hashing (PBKDF2)', () => {
  it('produces the documented format', async () => {
    const hash = await hashPassword('s3cret')
    const parts = hash.split('$')
    expect(parts[0]).toBe('pbkdf2')
    expect(parts[1]).toBe('210000')
    expect(parts).toHaveLength(4)
  })

  it('verifies a correct password', async () => {
    const hash = await hashPassword('s3cret')
    expect(await verifyPassword('s3cret', hash)).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('s3cret')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('uses a fresh salt per call', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'))
  })

  it('returns false for malformed stored value', async () => {
    expect(await verifyPassword('x', 'not-a-valid-hash')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/password.test.js`
Expected: FAIL — cannot find module `../src/lib/password.js`.

- [ ] **Step 3: Implement PBKDF2 hashing**

`api/src/lib/password.js`:
```js
const ITERATIONS = 210000
const KEY_BYTES = 32
const SALT_BYTES = 16
const encoder = new TextEncoder()

function toBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(text) {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function derive(plain, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(plain),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_BYTES * 8,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(plain) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(plain, salt, ITERATIONS)
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`
}

export async function verifyPassword(plain, stored) {
  if (typeof stored !== 'string') return false
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations <= 0) return false
  let salt
  let expected
  try {
    salt = fromBase64(parts[2])
    expected = fromBase64(parts[3])
  } catch {
    return false
  }
  const actual = await derive(plain, salt, iterations)
  return constantTimeEqual(actual, expected)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/password.test.js`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/lib/password.js api/test/password.test.js
git commit -m "feat(api): add PBKDF2 password hashing via Web Crypto"
```

---

## Task 4: JWT sign/verify

**Files:**
- Create: `api/src/lib/jwt.js`
- Test: `api/test/jwt.test.js`

**Interfaces:**
- Produces: `async signToken(payload: {sub, role}, secret: string) → string` — HS256, 7-day expiry.
- Produces: `async verifyToken(token: string, secret: string) → payload` — throws on invalid/expired token.

- [ ] **Step 1: Write the failing test**

`api/test/jwt.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { signToken, verifyToken } from '../src/lib/jwt.js'

const SECRET = 'unit-test-secret-value'

describe('jwt', () => {
  it('signs and verifies a payload round-trip', async () => {
    const token = await signToken({ sub: '42', role: 'admin' }, SECRET)
    const payload = await verifyToken(token, SECRET)
    expect(payload.sub).toBe('42')
    expect(payload.role).toBe('admin')
  })

  it('rejects a token signed with a different secret', async () => {
    const token = await signToken({ sub: '1', role: 'jury' }, SECRET)
    await expect(verifyToken(token, 'other-secret')).rejects.toThrow()
  })

  it('sets a 7-day expiry', async () => {
    const token = await signToken({ sub: '1', role: 'admin' }, SECRET)
    const payload = await verifyToken(token, SECRET)
    const sevenDays = 7 * 24 * 60 * 60
    expect(payload.exp - payload.iat).toBe(sevenDays)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/jwt.test.js`
Expected: FAIL — cannot find module `../src/lib/jwt.js`.

- [ ] **Step 3: Implement JWT with jose**

`api/src/lib/jwt.js`:
```js
import { SignJWT, jwtVerify } from 'jose'

const ALG = 'HS256'
const EXPIRY = '7d'
const encoder = new TextEncoder()

export async function signToken(payload, secret) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(encoder.encode(secret))
}

export async function verifyToken(token, secret) {
  const { payload } = await jwtVerify(token, encoder.encode(secret), { algorithms: [ALG] })
  return payload
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/jwt.test.js`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/lib/jwt.js api/test/jwt.test.js
git commit -m "feat(api): add JWT sign/verify with jose"
```

---

## Task 5: Database schema + migration runner

**Files:**
- Create: `api/migrations/0001_initial_schema.sql`
- Create: `api/scripts/migrate.js`

**Interfaces:**
- Produces: the Neon schema (all tables from the spec). Later tasks assume these exact table and column names.
- Produces: `npm run migrate` — reads every `.sql` file in `migrations/` in filename order and executes it against `DATABASE_URL`.

**Prerequisite (manual, done by the operator before running):** obtain the Neon connection string from the Neon console (project "awac"), and create `api/.dev.vars` from `.dev.vars.example` with the real `DATABASE_URL`. This file is gitignored.

- [ ] **Step 1: Write the schema**

`api/migrations/0001_initial_schema.sql`:
```sql
-- awac schema — voting contest for apprentice couturiers
-- Ranking is computed on read, never stored.

CREATE TABLE IF NOT EXISTS admins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jury_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES admins(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name         text NOT NULL,
  atelier           text,
  commune           text,
  phone             text,
  profile_photo_url text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  photo_url     text NOT NULL,
  storage_key   text NOT NULL,
  caption       text,
  photo_order   integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_candidate_photos_candidate ON candidate_photos(candidate_id);

CREATE TABLE IF NOT EXISTS criteria (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  description       text,
  weight_percentage numeric(5,2) NOT NULL CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  jury_id       uuid NOT NULL REFERENCES jury_members(id) ON DELETE CASCADE,
  submitted_at  timestamptz,
  is_locked     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, jury_id)
);

CREATE TABLE IF NOT EXISTS evaluation_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  criterion_id  uuid NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  score         numeric(6,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  UNIQUE (evaluation_id, criterion_id)
);

CREATE TABLE IF NOT EXISTS evaluation_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('appreciation', 'fault')),
  content       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS votes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id      uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  quantity          integer NOT NULL CHECK (quantity > 0),
  unit_price        integer NOT NULL CHECK (unit_price >= 0),
  total_amount      integer NOT NULL CHECK (total_amount >= 0),
  currency          text NOT NULL DEFAULT 'XOF',
  payment_provider  text,
  payment_status    text NOT NULL DEFAULT 'simulated',
  payment_reference text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_votes_candidate ON votes(candidate_id);

CREATE TABLE IF NOT EXISTS settings (
  id                     integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  vote_weight_percentage numeric(5,2) NOT NULL DEFAULT 50,
  jury_weight_percentage numeric(5,2) NOT NULL DEFAULT 50,
  vote_unit_price        integer NOT NULL DEFAULT 100,
  currency               text NOT NULL DEFAULT 'XOF',
  updated_at             timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Write the migration runner**

`api/scripts/migrate.js`:
```js
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, '..', 'migrations')

function loadDotVars() {
  try {
    const raw = readFileSync(join(here, '..', '.dev.vars'), 'utf8')
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/)
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
    }
  } catch {
    // .dev.vars optional if DATABASE_URL already in env
  }
}

async function main() {
  loadDotVars()
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL manquant (api/.dev.vars ou env)')
    process.exit(1)
  }

  const client = new pg.Client({ connectionString })
  await client.connect()

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    console.log(`Applying ${file}...`)
    await client.query(sql)
  }

  await client.end()
  console.log(`Done (${files.length} migration(s)).`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
```

- [ ] **Step 3: Run the migration against the Neon test/dev branch**

Run:
```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npm run migrate
```
Expected: prints `Applying 0001_initial_schema.sql...` then `Done (1 migration(s)).` with no error.

- [ ] **Step 4: Verify the tables exist**

Run:
```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && node -e "import('pg').then(async ({default:pg})=>{const {readFileSync}=await import('node:fs');const m=readFileSync('.dev.vars','utf8').match(/DATABASE_URL\s*=\s*\"?(.*?)\"?\s*$/m);const c=new pg.Client({connectionString:m[1]});await c.connect();const r=await c.query(\"select table_name from information_schema.tables where table_schema='public' order by table_name\");console.log(r.rows.map(x=>x.table_name).join(','));await c.end();})"
```
Expected: output contains `admins,candidate_photos,candidates,criteria,evaluation_notes,evaluation_scores,evaluations,jury_members,settings,votes`.

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/migrations/0001_initial_schema.sql api/scripts/migrate.js
git commit -m "feat(api): add Neon schema and migration runner"
```

---

## Task 6: DB client factory + context middleware

**Files:**
- Create: `api/src/db.js`
- Create: `api/src/middleware/context.js`
- Test: `api/test/context.test.js`

**Interfaces:**
- Produces: `createDb(connectionString: string)` → the `@neondatabase/serverless` tagged-template SQL function (`await db\`SELECT ...\`` returns a rows array).
- Produces: `contextMiddleware` — Hono middleware that sets `c.set('db', createDb(c.env.DATABASE_URL))`, `c.set('r2', c.env.PHOTOS)`, `c.set('jwtSecret', c.env.JWT_SECRET)`, and `c.set('r2PublicUrl', c.env.R2_PUBLIC_URL)`. Route handlers read these via `c.get(...)`.

- [ ] **Step 1: Write the failing test**

`api/test/context.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { contextMiddleware } from '../src/middleware/context.js'

describe('contextMiddleware', () => {
  it('injects db, r2, jwtSecret, r2PublicUrl from env', async () => {
    const fakeR2 = { name: 'r2' }
    const app = new Hono()
    app.use('*', contextMiddleware)
    app.get('/probe', (c) =>
      c.json({
        hasDb: typeof c.get('db') === 'function',
        r2: c.get('r2').name,
        secret: c.get('jwtSecret'),
        url: c.get('r2PublicUrl'),
      }),
    )
    const res = await app.request('/probe', {}, {
      DATABASE_URL: 'postgresql://u:p@ep-x.eu-west-2.aws.neon.tech/db?sslmode=require',
      PHOTOS: fakeR2,
      JWT_SECRET: 'sekret',
      R2_PUBLIC_URL: 'https://x.r2.dev',
    })
    expect(await res.json()).toEqual({ hasDb: true, r2: 'r2', secret: 'sekret', url: 'https://x.r2.dev' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/context.test.js`
Expected: FAIL — cannot find module `../src/middleware/context.js`.

- [ ] **Step 3: Implement the db factory and middleware**

`api/src/db.js`:
```js
import { neon } from '@neondatabase/serverless'

export function createDb(connectionString) {
  return neon(connectionString)
}
```

`api/src/middleware/context.js`:
```js
import { createDb } from '../db.js'

export async function contextMiddleware(c, next) {
  c.set('db', createDb(c.env.DATABASE_URL))
  c.set('r2', c.env.PHOTOS)
  c.set('jwtSecret', c.env.JWT_SECRET)
  c.set('r2PublicUrl', c.env.R2_PUBLIC_URL)
  await next()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/context.test.js`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/db.js api/src/middleware/context.js api/test/context.test.js
git commit -m "feat(api): add Neon client factory and context middleware"
```

---

## Task 7: Auth middleware (role guard)

**Files:**
- Create: `api/src/middleware/auth.js`
- Test: `api/test/auth.middleware.test.js`

**Interfaces:**
- Consumes: `verifyToken` (Task 4), `sendError`/`ERRORS` (Task 2), `jwtSecret` from context (Task 6).
- Produces: `requireRole(...allowed: string[])` → Hono middleware. Reads `Authorization: Bearer <token>`, verifies it with `c.get('jwtSecret')`, sets `c.set('user', { id: payload.sub, role: payload.role })`. Returns 401 if missing/invalid token, 403 if role not in `allowed`. `requireRole()` with no args allows any authenticated user.

- [ ] **Step 1: Write the failing test**

`api/test/auth.middleware.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { requireRole } from '../src/middleware/auth.js'
import { signToken } from '../src/lib/jwt.js'

const SECRET = 'test-secret'

function appWith(guard) {
  const app = new Hono()
  app.use('*', async (c, next) => { c.set('jwtSecret', SECRET); await next() })
  app.get('/protected', guard, (c) => c.json({ user: c.get('user') }))
  return app
}

describe('requireRole', () => {
  it('401 without a token', async () => {
    const res = await appWith(requireRole('admin')).request('/protected')
    expect(res.status).toBe(401)
  })

  it('401 with an invalid token', async () => {
    const res = await appWith(requireRole('admin')).request('/protected', {
      headers: { Authorization: 'Bearer garbage' },
    })
    expect(res.status).toBe(401)
  })

  it('403 when role is not allowed', async () => {
    const token = await signToken({ sub: '1', role: 'jury' }, SECRET)
    const res = await appWith(requireRole('admin')).request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(403)
  })

  it('passes and exposes the user for an allowed role', async () => {
    const token = await signToken({ sub: '7', role: 'admin' }, SECRET)
    const res = await appWith(requireRole('admin')).request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user: { id: '7', role: 'admin' } })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/auth.middleware.test.js`
Expected: FAIL — cannot find module `../src/middleware/auth.js`.

- [ ] **Step 3: Implement the guard**

`api/src/middleware/auth.js`:
```js
import { verifyToken } from '../lib/jwt.js'
import { sendError, ERRORS } from '../lib/errors.js'

export function requireRole(...allowed) {
  return async (c, next) => {
    const header = c.req.header('Authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return sendError(c, ERRORS.UNAUTHORIZED)

    let payload
    try {
      payload = await verifyToken(token, c.get('jwtSecret'))
    } catch {
      return sendError(c, ERRORS.UNAUTHORIZED)
    }

    if (allowed.length > 0 && !allowed.includes(payload.role)) {
      return sendError(c, ERRORS.FORBIDDEN)
    }

    c.set('user', { id: payload.sub, role: payload.role })
    await next()
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/auth.middleware.test.js`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/middleware/auth.js api/test/auth.middleware.test.js
git commit -m "feat(api): add JWT role-guard middleware"
```

---

## Task 8: Combined ranking logic (pure)

**Files:**
- Create: `api/src/lib/scoring.js`
- Test: `api/test/scoring.test.js`

**Interfaces:**
- Produces: `computeRanking({ candidates, criteria, evaluations, evaluationScores, voteTotals, settings }) → RankedCandidate[]`, sorted by `finalScore` descending. Inputs are plain arrays/objects (no DB):
  - `candidates`: `[{ id, full_name }]`
  - `criteria`: `[{ id, weight_percentage }]`
  - `evaluations`: `[{ id, candidate_id, is_locked }]` (only `is_locked === true` count)
  - `evaluationScores`: `[{ evaluation_id, criterion_id, score }]`
  - `voteTotals`: `[{ candidate_id, votes }]` (`votes` = sum of vote quantities)
  - `settings`: `{ vote_weight_percentage, jury_weight_percentage }`
  - Each `RankedCandidate`: `{ id, full_name, juryScore, voteScore, finalScore, totalVotes }` — `juryScore`/`voteScore`/`finalScore` are numbers 0–100 rounded to 2 decimals.
- Rules: `juryScore` = average across locked evaluations of the weighted sum of that evaluation's criterion scores (weights normalized to sum 1). `voteScore` = candidate votes ÷ max candidate votes × 100 (0 when no votes exist anywhere). `finalScore` = `jury_weight% × juryScore + vote_weight% × voteScore` (weights as percentages summing to 100). A candidate with no locked evaluations has `juryScore = 0`.

- [ ] **Step 1: Write the failing test**

`api/test/scoring.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { computeRanking } from '../src/lib/scoring.js'

describe('computeRanking', () => {
  const criteria = [
    { id: 'c1', weight_percentage: 60 },
    { id: 'c2', weight_percentage: 40 },
  ]
  const settings = { vote_weight_percentage: 50, jury_weight_percentage: 50 }

  it('averages locked evaluations with weighted criteria', () => {
    const candidates = [{ id: 'a', full_name: 'A' }, { id: 'b', full_name: 'B' }]
    const evaluations = [
      { id: 'e1', candidate_id: 'a', is_locked: true },
      { id: 'e2', candidate_id: 'a', is_locked: true },
      { id: 'e3', candidate_id: 'b', is_locked: false }, // ignored
    ]
    const evaluationScores = [
      { evaluation_id: 'e1', criterion_id: 'c1', score: 100 },
      { evaluation_id: 'e1', criterion_id: 'c2', score: 50 },   // e1 weighted = 60+20 = 80
      { evaluation_id: 'e2', criterion_id: 'c1', score: 40 },
      { evaluation_id: 'e2', criterion_id: 'c2', score: 100 },  // e2 weighted = 24+40 = 64
      { evaluation_id: 'e3', criterion_id: 'c1', score: 100 },
    ]
    const voteTotals = [{ candidate_id: 'a', votes: 10 }, { candidate_id: 'b', votes: 20 }]
    const ranking = computeRanking({ candidates, criteria, evaluations, evaluationScores, voteTotals, settings })

    const a = ranking.find((r) => r.id === 'a')
    expect(a.juryScore).toBe(72)      // (80 + 64) / 2
    expect(a.voteScore).toBe(50)      // 10 / 20 * 100
    expect(a.finalScore).toBe(61)     // 0.5*72 + 0.5*50
    expect(a.totalVotes).toBe(10)

    const b = ranking.find((r) => r.id === 'b')
    expect(b.juryScore).toBe(0)       // no locked evaluations
    expect(b.voteScore).toBe(100)     // top votes
    expect(b.finalScore).toBe(50)     // 0.5*0 + 0.5*100
  })

  it('sorts by finalScore descending', () => {
    const candidates = [{ id: 'a', full_name: 'A' }, { id: 'b', full_name: 'B' }]
    const evaluations = []
    const evaluationScores = []
    const voteTotals = [{ candidate_id: 'a', votes: 5 }, { candidate_id: 'b', votes: 50 }]
    const ranking = computeRanking({ candidates, criteria, evaluations, evaluationScores, voteTotals, settings })
    expect(ranking.map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('handles no votes anywhere (voteScore 0)', () => {
    const candidates = [{ id: 'a', full_name: 'A' }]
    const ranking = computeRanking({
      candidates, criteria, evaluations: [], evaluationScores: [], voteTotals: [], settings,
    })
    expect(ranking[0].voteScore).toBe(0)
    expect(ranking[0].finalScore).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/scoring.test.js`
Expected: FAIL — cannot find module `../src/lib/scoring.js`.

- [ ] **Step 3: Implement the ranking**

`api/src/lib/scoring.js`:
```js
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function weightedEvaluationScore(scoresForEval, criteria, totalWeight) {
  let sum = 0
  for (const criterion of criteria) {
    const entry = scoresForEval.find((s) => s.criterion_id === criterion.id)
    if (!entry) continue
    sum += Number(entry.score) * (Number(criterion.weight_percentage) / totalWeight)
  }
  return sum
}

export function computeRanking({ candidates, criteria, evaluations, evaluationScores, voteTotals, settings }) {
  const totalWeight = criteria.reduce((acc, c) => acc + Number(c.weight_percentage), 0) || 1
  const votesByCandidate = new Map(voteTotals.map((v) => [v.candidate_id, Number(v.votes)]))
  const maxVotes = Math.max(0, ...votesByCandidate.values())

  const juryWeight = Number(settings.jury_weight_percentage) / 100
  const voteWeight = Number(settings.vote_weight_percentage) / 100

  const ranked = candidates.map((candidate) => {
    const lockedEvals = evaluations.filter((e) => e.candidate_id === candidate.id && e.is_locked === true)
    let juryScore = 0
    if (lockedEvals.length > 0) {
      const perEval = lockedEvals.map((e) => {
        const scores = evaluationScores.filter((s) => s.evaluation_id === e.id)
        return weightedEvaluationScore(scores, criteria, totalWeight)
      })
      juryScore = perEval.reduce((a, b) => a + b, 0) / lockedEvals.length
    }

    const totalVotes = votesByCandidate.get(candidate.id) ?? 0
    const voteScore = maxVotes > 0 ? (totalVotes / maxVotes) * 100 : 0
    const finalScore = juryWeight * juryScore + voteWeight * voteScore

    return {
      id: candidate.id,
      full_name: candidate.full_name,
      juryScore: round2(juryScore),
      voteScore: round2(voteScore),
      finalScore: round2(finalScore),
      totalVotes,
    }
  })

  return ranked.sort((a, b) => b.finalScore - a.finalScore)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/scoring.test.js`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/lib/scoring.js api/test/scoring.test.js
git commit -m "feat(api): add combined ranking computation"
```

---

## Task 9: Auth routes (login)

**Files:**
- Create: `api/src/routes/auth.js`
- Test: `api/test/auth.routes.test.js`

**Interfaces:**
- Consumes: `verifyPassword` (Task 3), `signToken` (Task 4), `sendError`/`ERRORS` (Task 2), `db` from context.
- Produces: a Hono router with:
  - `POST /auth/login/admin` — body `{ email, password }`. On success `{ token, user: { id, role: 'admin', full_name } }`; 401 `invalid_credentials` otherwise.
  - `POST /auth/login/jury` — body `{ username, password }`. On success `{ token, user: { id, role: 'jury', full_name } }`; 401 `invalid_credentials` on bad creds or inactive account.
- The router is exported as `default` and mounted at `/` (paths include `/auth/...`).

- [ ] **Step 1: Write the failing test**

`api/test/auth.routes.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { buildTestApp } from './helpers.js'
import authRouter from '../src/routes/auth.js'
import { hashPassword } from '../src/lib/password.js'
import { verifyToken } from '../src/lib/jwt.js'

function fakeDb(rowsByShape) {
  // returns a tagged-template fn; matches on the first string fragment
  return (strings) => {
    const key = strings.join('?').toLowerCase()
    for (const [needle, rows] of rowsByShape) {
      if (key.includes(needle)) return Promise.resolve(rows)
    }
    return Promise.resolve([])
  }
}

describe('POST /auth/login/admin', () => {
  it('returns a token for valid credentials', async () => {
    const hash = await hashPassword('pw')
    const db = fakeDb([['from admins', [{ id: 'a1', full_name: 'Boss', password_hash: hash }]]])
    const app = buildTestApp({ db }, (a) => a.route('/', authRouter))
    const res = await app.request('/auth/login/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'boss@x.com', password: 'pw' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user).toEqual({ id: 'a1', role: 'admin', full_name: 'Boss' })
    const payload = await verifyToken(body.token, 'test-secret')
    expect(payload).toMatchObject({ sub: 'a1', role: 'admin' })
  })

  it('401 on wrong password', async () => {
    const hash = await hashPassword('pw')
    const db = fakeDb([['from admins', [{ id: 'a1', full_name: 'Boss', password_hash: hash }]]])
    const app = buildTestApp({ db }, (a) => a.route('/', authRouter))
    const res = await app.request('/auth/login/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'boss@x.com', password: 'nope' }),
    })
    expect(res.status).toBe(401)
    expect((await res.json()).error.code).toBe('invalid_credentials')
  })

  it('401 on unknown email', async () => {
    const db = fakeDb([['from admins', []]])
    const app = buildTestApp({ db }, (a) => a.route('/', authRouter))
    const res = await app.request('/auth/login/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost@x.com', password: 'pw' }),
    })
    expect(res.status).toBe(401)
  })
})

describe('POST /auth/login/jury', () => {
  it('rejects an inactive jury account', async () => {
    const hash = await hashPassword('pw')
    const db = fakeDb([['from jury_members', [{ id: 'j1', full_name: 'Juror', password_hash: hash, is_active: false }]]])
    const app = buildTestApp({ db }, (a) => a.route('/', authRouter))
    const res = await app.request('/auth/login/jury', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'juror', password: 'pw' }),
    })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/auth.routes.test.js`
Expected: FAIL — cannot find module `../src/routes/auth.js`.

- [ ] **Step 3: Implement the auth router**

`api/src/routes/auth.js`:
```js
import { Hono } from 'hono'
import { verifyPassword } from '../lib/password.js'
import { signToken } from '../lib/jwt.js'
import { sendError, ERRORS } from '../lib/errors.js'

const router = new Hono()

router.post('/auth/login/admin', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}))
  if (!email || !password) return sendError(c, ERRORS.INVALID_CREDENTIALS)

  const db = c.get('db')
  const rows = await db`SELECT id, full_name, password_hash FROM admins WHERE email = ${email} LIMIT 1`
  const admin = rows[0]
  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    return sendError(c, ERRORS.INVALID_CREDENTIALS)
  }

  const token = await signToken({ sub: admin.id, role: 'admin' }, c.get('jwtSecret'))
  return c.json({ token, user: { id: admin.id, role: 'admin', full_name: admin.full_name } })
})

router.post('/auth/login/jury', async (c) => {
  const { username, password } = await c.req.json().catch(() => ({}))
  if (!username || !password) return sendError(c, ERRORS.INVALID_CREDENTIALS)

  const db = c.get('db')
  const rows = await db`SELECT id, full_name, password_hash, is_active FROM jury_members WHERE username = ${username} LIMIT 1`
  const jury = rows[0]
  if (!jury || jury.is_active !== true || !(await verifyPassword(password, jury.password_hash))) {
    return sendError(c, ERRORS.INVALID_CREDENTIALS)
  }

  const token = await signToken({ sub: jury.id, role: 'jury' }, c.get('jwtSecret'))
  return c.json({ token, user: { id: jury.id, role: 'jury', full_name: jury.full_name } })
})

export default router
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/auth.routes.test.js`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/routes/auth.js api/test/auth.routes.test.js
git commit -m "feat(api): add admin and jury login routes"
```

---

## Task 10: Candidates routes (CRUD + public list)

**Files:**
- Create: `api/src/routes/candidates.js`
- Test: `api/test/candidates.routes.test.js`

**Interfaces:**
- Consumes: `requireRole` (Task 7), `sendError`/`ERRORS` (Task 2), `db` from context.
- Produces: a Hono router mounted at `/candidates`:
  - `GET /candidates` — public, returns `[{ id, full_name, atelier, commune, profile_photo_url }]`.
  - `GET /candidates/:id` — public, returns the candidate plus `photos: [{ id, photo_url, caption, photo_order }]`; 404 if absent.
  - `POST /candidates` — admin only, body `{ full_name, atelier?, commune?, phone? }`; 201 with created row; 400 if `full_name` missing.
  - `PATCH /candidates/:id` — admin only, partial update of the same fields; 404 if absent.
  - `DELETE /candidates/:id` — admin only; 204; 404 if absent.

- [ ] **Step 1: Write the failing test**

`api/test/candidates.routes.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { buildTestApp } from './helpers.js'
import candidatesRouter from '../src/routes/candidates.js'
import { signToken } from '../src/lib/jwt.js'

async function adminAuth() {
  const token = await signToken({ sub: 'admin1', role: 'admin' }, 'test-secret')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

function recordingDb(result = []) {
  const calls = []
  const db = (strings, ...params) => {
    calls.push({ sql: strings.join('?'), params })
    return Promise.resolve(typeof result === 'function' ? result(strings, params) : result)
  }
  db.calls = calls
  return db
}

describe('candidates routes', () => {
  it('GET /candidates is public', async () => {
    const db = recordingDb([{ id: 'c1', full_name: 'A', atelier: null, commune: null, profile_photo_url: null }])
    const app = buildTestApp({ db }, (a) => a.route('/candidates', candidatesRouter))
    const res = await app.request('/candidates')
    expect(res.status).toBe(200)
    expect((await res.json())[0].id).toBe('c1')
  })

  it('POST /candidates requires admin', async () => {
    const db = recordingDb([])
    const app = buildTestApp({ db }, (a) => a.route('/candidates', candidatesRouter))
    const res = await app.request('/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: 'X' }),
    })
    expect(res.status).toBe(401)
  })

  it('POST /candidates creates a candidate for admin', async () => {
    const db = recordingDb([{ id: 'new1', full_name: 'New', atelier: 'At', commune: 'Co', phone: null }])
    const app = buildTestApp({ db }, (a) => a.route('/candidates', candidatesRouter))
    const res = await app.request('/candidates', {
      method: 'POST',
      headers: await adminAuth(),
      body: JSON.stringify({ full_name: 'New', atelier: 'At', commune: 'Co' }),
    })
    expect(res.status).toBe(201)
    expect((await res.json()).id).toBe('new1')
  })

  it('POST /candidates 400 without full_name', async () => {
    const db = recordingDb([])
    const app = buildTestApp({ db }, (a) => a.route('/candidates', candidatesRouter))
    const res = await app.request('/candidates', {
      method: 'POST',
      headers: await adminAuth(),
      body: JSON.stringify({ atelier: 'At' }),
    })
    expect(res.status).toBe(400)
  })

  it('DELETE /candidates/:id 404 when nothing deleted', async () => {
    const db = recordingDb([]) // no rows returned by DELETE ... RETURNING
    const app = buildTestApp({ db }, (a) => a.route('/candidates', candidatesRouter))
    const res = await app.request('/candidates/missing', { method: 'DELETE', headers: await adminAuth() })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/candidates.routes.test.js`
Expected: FAIL — cannot find module `../src/routes/candidates.js`.

- [ ] **Step 3: Implement the candidates router**

`api/src/routes/candidates.js`:
```js
import { Hono } from 'hono'
import { requireRole } from '../middleware/auth.js'
import { sendError, ERRORS } from '../lib/errors.js'

const router = new Hono()

router.get('/', async (c) => {
  const db = c.get('db')
  const rows = await db`SELECT id, full_name, atelier, commune, profile_photo_url FROM candidates ORDER BY full_name`
  return c.json(rows)
})

router.get('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const rows = await db`SELECT id, full_name, atelier, commune, phone, profile_photo_url FROM candidates WHERE id = ${id} LIMIT 1`
  const candidate = rows[0]
  if (!candidate) return sendError(c, ERRORS.NOT_FOUND)
  const photos = await db`SELECT id, photo_url, caption, photo_order FROM candidate_photos WHERE candidate_id = ${id} ORDER BY photo_order`
  return c.json({ ...candidate, photos })
})

router.post('/', requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { full_name, atelier = null, commune = null, phone = null } = body
  if (!full_name) return sendError(c, ERRORS.VALIDATION, 'Le nom complet est requis')
  const db = c.get('db')
  const rows = await db`
    INSERT INTO candidates (full_name, atelier, commune, phone)
    VALUES (${full_name}, ${atelier}, ${commune}, ${phone})
    RETURNING id, full_name, atelier, commune, phone, profile_photo_url`
  return c.json(rows[0], 201)
})

router.patch('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const db = c.get('db')
  const rows = await db`
    UPDATE candidates SET
      full_name = COALESCE(${body.full_name ?? null}, full_name),
      atelier   = COALESCE(${body.atelier ?? null}, atelier),
      commune   = COALESCE(${body.commune ?? null}, commune),
      phone     = COALESCE(${body.phone ?? null}, phone),
      updated_at = now()
    WHERE id = ${id}
    RETURNING id, full_name, atelier, commune, phone, profile_photo_url`
  if (!rows[0]) return sendError(c, ERRORS.NOT_FOUND)
  return c.json(rows[0])
})

router.delete('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id')
  const db = c.get('db')
  const rows = await db`DELETE FROM candidates WHERE id = ${id} RETURNING id`
  if (!rows[0]) return sendError(c, ERRORS.NOT_FOUND)
  return c.body(null, 204)
})

export default router
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/candidates.routes.test.js`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/routes/candidates.js api/test/candidates.routes.test.js
git commit -m "feat(api): add candidates CRUD and public read routes"
```

---

## Task 11: Photo upload/delete (R2)

**Files:**
- Create: `api/src/routes/photos.js`
- Test: `api/test/photos.routes.test.js`

**Interfaces:**
- Consumes: `requireRole` (Task 7), `sendError`/`ERRORS` (Task 2), `db` + `r2` + `r2PublicUrl` from context.
- Produces: a Hono router mounted at `/candidates/:candidateId/photos`:
  - `POST /` — admin only, multipart form with `file` (and optional `caption`, `is_profile`). Writes to R2 under key `candidates/<candidateId>/<uuid>-<filename>`, then: if `is_profile === 'true'` updates `candidates.profile_photo_url`; else inserts into `candidate_photos`. Returns 201 with `{ id?, photo_url }`.
  - `DELETE /:photoId` — admin only, deletes the R2 object and the `candidate_photos` row; 404 if the row is absent.
- R2 fake for tests exposes `put(key, body)`, `delete(key)`, and records calls.

- [ ] **Step 1: Write the failing test**

`api/test/photos.routes.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { buildTestApp } from './helpers.js'
import photosRouter from '../src/routes/photos.js'
import { signToken } from '../src/lib/jwt.js'

async function adminHeader() {
  const token = await signToken({ sub: 'a1', role: 'admin' }, 'test-secret')
  return `Bearer ${token}`
}

function fakeR2() {
  const puts = []
  const deletes = []
  return {
    put: (key, body) => { puts.push(key); return Promise.resolve({ key }) },
    delete: (key) => { deletes.push(key); return Promise.resolve() },
    puts,
    deletes,
  }
}

describe('photo routes', () => {
  it('uploads a work photo into candidate_photos', async () => {
    const r2 = fakeR2()
    const db = (strings) => {
      if (strings.join('?').includes('INSERT INTO candidate_photos')) {
        return Promise.resolve([{ id: 'p1', photo_url: 'https://x.r2.dev/candidates/c1/foo.jpg' }])
      }
      return Promise.resolve([])
    }
    const app = buildTestApp({ db, r2, jwtSecret: 'test-secret' }, (a) =>
      a.route('/candidates/:candidateId/photos', photosRouter),
    )
    const form = new FormData()
    form.append('file', new File(['bytes'], 'foo.jpg', { type: 'image/jpeg' }))
    form.append('caption', 'Ma création')
    const res = await app.request('/candidates/c1/photos', {
      method: 'POST',
      headers: { Authorization: await adminHeader() },
      body: form,
    })
    expect(res.status).toBe(201)
    expect(r2.puts).toHaveLength(1)
    expect(r2.puts[0]).toContain('candidates/c1/')
    expect((await res.json()).photo_url).toContain('r2.dev')
  })

  it('requires admin', async () => {
    const r2 = fakeR2()
    const db = () => Promise.resolve([])
    const app = buildTestApp({ db, r2 }, (a) => a.route('/candidates/:candidateId/photos', photosRouter))
    const form = new FormData()
    form.append('file', new File(['b'], 'x.jpg', { type: 'image/jpeg' }))
    const res = await app.request('/candidates/c1/photos', { method: 'POST', body: form })
    expect(res.status).toBe(401)
  })

  it('deletes a photo and its R2 object', async () => {
    const r2 = fakeR2()
    const db = (strings) => {
      if (strings.join('?').includes('DELETE FROM candidate_photos')) {
        return Promise.resolve([{ id: 'p1', storage_key: 'candidates/c1/foo.jpg' }])
      }
      return Promise.resolve([])
    }
    const app = buildTestApp({ db, r2, jwtSecret: 'test-secret' }, (a) =>
      a.route('/candidates/:candidateId/photos', photosRouter),
    )
    const res = await app.request('/candidates/c1/photos/p1', {
      method: 'DELETE',
      headers: { Authorization: await adminHeader() },
    })
    expect(res.status).toBe(204)
    expect(r2.deletes).toEqual(['candidates/c1/foo.jpg'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/photos.routes.test.js`
Expected: FAIL — cannot find module `../src/routes/photos.js`.

- [ ] **Step 3: Implement the photos router**

`api/src/routes/photos.js`:
```js
import { Hono } from 'hono'
import { requireRole } from '../middleware/auth.js'
import { sendError, ERRORS } from '../lib/errors.js'

const router = new Hono()

function safeName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
}

router.post('/', requireRole('admin'), async (c) => {
  const candidateId = c.req.param('candidateId')
  const form = await c.req.formData()
  const file = form.get('file')
  if (!file || typeof file === 'string') return sendError(c, ERRORS.VALIDATION, 'Fichier manquant')

  const key = `candidates/${candidateId}/${crypto.randomUUID()}-${safeName(file.name)}`
  const r2 = c.get('r2')
  await r2.put(key, file.stream ? file.stream() : await file.arrayBuffer())

  const photoUrl = `${c.get('r2PublicUrl')}/${key}`
  const db = c.get('db')
  const isProfile = form.get('is_profile') === 'true'

  if (isProfile) {
    await db`UPDATE candidates SET profile_photo_url = ${photoUrl}, updated_at = now() WHERE id = ${candidateId}`
    return c.json({ photo_url: photoUrl }, 201)
  }

  const caption = form.get('caption') ?? null
  const rows = await db`
    INSERT INTO candidate_photos (candidate_id, photo_url, storage_key, caption)
    VALUES (${candidateId}, ${photoUrl}, ${key}, ${caption})
    RETURNING id, photo_url`
  return c.json(rows[0], 201)
})

router.delete('/:photoId', requireRole('admin'), async (c) => {
  const photoId = c.req.param('photoId')
  const db = c.get('db')
  const rows = await db`DELETE FROM candidate_photos WHERE id = ${photoId} RETURNING id, storage_key`
  if (!rows[0]) return sendError(c, ERRORS.NOT_FOUND)
  await c.get('r2').delete(rows[0].storage_key)
  return c.body(null, 204)
})

export default router
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/photos.routes.test.js`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/routes/photos.js api/test/photos.routes.test.js
git commit -m "feat(api): add candidate photo upload/delete via R2"
```

---

## Task 12: Criteria routes (with sum ≤ 100 guard)

**Files:**
- Create: `api/src/routes/criteria.js`
- Test: `api/test/criteria.routes.test.js`

**Interfaces:**
- Consumes: `requireRole` (Task 7), `sendError`/`ERRORS` (Task 2), `db` from context.
- Produces: a Hono router mounted at `/criteria`:
  - `GET /criteria` — any authenticated user (`requireRole()`), returns `[{ id, name, description, weight_percentage }]`.
  - `POST /criteria` — admin only, body `{ name, description?, weight_percentage }`; 400 if `name` missing, `weight_percentage` not in 0–100, or the new total across all criteria would exceed 100.
  - `DELETE /criteria/:id` — admin only; 204; 404 if absent.

- [ ] **Step 1: Write the failing test**

`api/test/criteria.routes.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { buildTestApp } from './helpers.js'
import criteriaRouter from '../src/routes/criteria.js'
import { signToken } from '../src/lib/jwt.js'

async function adminHeaders() {
  const token = await signToken({ sub: 'a1', role: 'admin' }, 'test-secret')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

describe('criteria routes', () => {
  it('rejects a weight that would push the total over 100', async () => {
    const db = (strings) => {
      if (strings.join('?').includes('SUM(weight_percentage)')) return Promise.resolve([{ total: 80 }])
      return Promise.resolve([])
    }
    const app = buildTestApp({ db }, (a) => a.route('/criteria', criteriaRouter))
    const res = await app.request('/criteria', {
      method: 'POST',
      headers: await adminHeaders(),
      body: JSON.stringify({ name: 'Créativité', weight_percentage: 30 }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('validation_error')
  })

  it('creates a criterion when the total stays within 100', async () => {
    const db = (strings) => {
      if (strings.join('?').includes('SUM(weight_percentage)')) return Promise.resolve([{ total: 40 }])
      if (strings.join('?').includes('INSERT INTO criteria')) {
        return Promise.resolve([{ id: 'cr1', name: 'Créativité', description: null, weight_percentage: 30 }])
      }
      return Promise.resolve([])
    }
    const app = buildTestApp({ db }, (a) => a.route('/criteria', criteriaRouter))
    const res = await app.request('/criteria', {
      method: 'POST',
      headers: await adminHeaders(),
      body: JSON.stringify({ name: 'Créativité', weight_percentage: 30 }),
    })
    expect(res.status).toBe(201)
    expect((await res.json()).id).toBe('cr1')
  })

  it('GET /criteria needs authentication', async () => {
    const db = () => Promise.resolve([])
    const app = buildTestApp({ db }, (a) => a.route('/criteria', criteriaRouter))
    const res = await app.request('/criteria')
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/criteria.routes.test.js`
Expected: FAIL — cannot find module `../src/routes/criteria.js`.

- [ ] **Step 3: Implement the criteria router**

`api/src/routes/criteria.js`:
```js
import { Hono } from 'hono'
import { requireRole } from '../middleware/auth.js'
import { sendError, ERRORS } from '../lib/errors.js'

const MAX_TOTAL = 100

const router = new Hono()

router.get('/', requireRole(), async (c) => {
  const db = c.get('db')
  const rows = await db`SELECT id, name, description, weight_percentage FROM criteria ORDER BY created_at`
  return c.json(rows)
})

router.post('/', requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { name, description = null } = body
  const weight = Number(body.weight_percentage)
  if (!name) return sendError(c, ERRORS.VALIDATION, 'Le nom du critère est requis')
  if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
    return sendError(c, ERRORS.VALIDATION, 'Le poids doit être compris entre 0 et 100')
  }

  const db = c.get('db')
  const totals = await db`SELECT COALESCE(SUM(weight_percentage), 0) AS total FROM criteria`
  const currentTotal = Number(totals[0].total)
  if (currentTotal + weight > MAX_TOTAL) {
    return sendError(c, ERRORS.VALIDATION, `La somme des poids dépasserait 100 (actuel : ${currentTotal})`)
  }

  const rows = await db`
    INSERT INTO criteria (name, description, weight_percentage)
    VALUES (${name}, ${description}, ${weight})
    RETURNING id, name, description, weight_percentage`
  return c.json(rows[0], 201)
})

router.delete('/:id', requireRole('admin'), async (c) => {
  const db = c.get('db')
  const rows = await db`DELETE FROM criteria WHERE id = ${c.req.param('id')} RETURNING id`
  if (!rows[0]) return sendError(c, ERRORS.NOT_FOUND)
  return c.body(null, 204)
})

export default router
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/criteria.routes.test.js`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/routes/criteria.js api/test/criteria.routes.test.js
git commit -m "feat(api): add criteria routes with weight-sum guard"
```

---

## Task 13: Evaluations routes (submit + lock)

**Files:**
- Create: `api/src/routes/evaluations.js`
- Test: `api/test/evaluations.routes.test.js`

**Interfaces:**
- Consumes: `requireRole` (Task 7), `sendError`/`ERRORS` (Task 2), `db` + `user` from context.
- Produces: a Hono router mounted at `/evaluations`:
  - `POST /evaluations` — jury only. Body `{ candidate_id, scores: [{ criterion_id, score }], notes?: [{ type, content }], submit?: boolean }`. Upserts one evaluation per (candidate, current jury). If an existing evaluation for that pair is `is_locked`, returns 409 `locked`. Replaces its scores and notes. When `submit === true`, sets `submitted_at = now()` and `is_locked = true`. Returns `{ id, is_locked }`.
  - `GET /evaluations/mine/:candidateId` — jury only, returns the current jury's evaluation for that candidate with its scores and notes, or 404.
- Note: since `db` here is the tagged-template neon function, the handler runs statements sequentially (no explicit transaction in v1 — acceptable for a single-jury edit path; documented as a known limitation).

- [ ] **Step 1: Write the failing test**

`api/test/evaluations.routes.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { buildTestApp } from './helpers.js'
import evaluationsRouter from '../src/routes/evaluations.js'
import { signToken } from '../src/lib/jwt.js'

async function juryHeaders(sub = 'j1') {
  const token = await signToken({ sub, role: 'jury' }, 'test-secret')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

describe('evaluations routes', () => {
  it('blocks editing a locked evaluation', async () => {
    const db = (strings) => {
      if (strings.join('?').includes('SELECT id, is_locked FROM evaluations')) {
        return Promise.resolve([{ id: 'e1', is_locked: true }])
      }
      return Promise.resolve([])
    }
    const app = buildTestApp({ db }, (a) => a.route('/evaluations', evaluationsRouter))
    const res = await app.request('/evaluations', {
      method: 'POST',
      headers: await juryHeaders(),
      body: JSON.stringify({ candidate_id: 'c1', scores: [{ criterion_id: 'cr1', score: 80 }] }),
    })
    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('locked')
  })

  it('submits and locks an evaluation', async () => {
    const state = { locked: false }
    const db = (strings, ...params) => {
      const sql = strings.join('?')
      if (sql.includes('SELECT id, is_locked FROM evaluations')) return Promise.resolve([]) // none yet
      if (sql.includes('INSERT INTO evaluations')) return Promise.resolve([{ id: 'e9', is_locked: params.includes(true) }])
      if (sql.includes('UPDATE evaluations')) { state.locked = true; return Promise.resolve([{ id: 'e9', is_locked: true }]) }
      return Promise.resolve([])
    }
    const app = buildTestApp({ db }, (a) => a.route('/evaluations', evaluationsRouter))
    const res = await app.request('/evaluations', {
      method: 'POST',
      headers: await juryHeaders(),
      body: JSON.stringify({
        candidate_id: 'c1',
        scores: [{ criterion_id: 'cr1', score: 80 }],
        notes: [{ type: 'appreciation', content: 'Beau travail' }],
        submit: true,
      }),
    })
    expect(res.status).toBe(200)
    expect((await res.json()).is_locked).toBe(true)
  })

  it('requires jury role', async () => {
    const db = () => Promise.resolve([])
    const app = buildTestApp({ db }, (a) => a.route('/evaluations', evaluationsRouter))
    const res = await app.request('/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: 'c1', scores: [] }),
    })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/evaluations.routes.test.js`
Expected: FAIL — cannot find module `../src/routes/evaluations.js`.

- [ ] **Step 3: Implement the evaluations router**

`api/src/routes/evaluations.js`:
```js
import { Hono } from 'hono'
import { requireRole } from '../middleware/auth.js'
import { sendError, ERRORS } from '../lib/errors.js'

const router = new Hono()

router.post('/', requireRole('jury'), async (c) => {
  const juryId = c.get('user').id
  const body = await c.req.json().catch(() => ({}))
  const { candidate_id, scores = [], notes = [], submit = false } = body
  if (!candidate_id || !Array.isArray(scores)) {
    return sendError(c, ERRORS.VALIDATION, 'candidate_id et scores sont requis')
  }

  const db = c.get('db')
  const existing = await db`SELECT id, is_locked FROM evaluations WHERE candidate_id = ${candidate_id} AND jury_id = ${juryId} LIMIT 1`
  if (existing[0]?.is_locked === true) return sendError(c, ERRORS.LOCKED, 'Évaluation déjà validée, modification impossible')

  const upserted = await db`
    INSERT INTO evaluations (candidate_id, jury_id)
    VALUES (${candidate_id}, ${juryId})
    ON CONFLICT (candidate_id, jury_id) DO UPDATE SET updated_at = now()
    RETURNING id`
  const evaluationId = upserted[0].id

  await db`DELETE FROM evaluation_scores WHERE evaluation_id = ${evaluationId}`
  for (const s of scores) {
    await db`INSERT INTO evaluation_scores (evaluation_id, criterion_id, score) VALUES (${evaluationId}, ${s.criterion_id}, ${Number(s.score)})`
  }

  await db`DELETE FROM evaluation_notes WHERE evaluation_id = ${evaluationId}`
  for (const n of notes) {
    if (n.type !== 'appreciation' && n.type !== 'fault') continue
    await db`INSERT INTO evaluation_notes (evaluation_id, type, content) VALUES (${evaluationId}, ${n.type}, ${n.content})`
  }

  if (submit === true) {
    const locked = await db`UPDATE evaluations SET submitted_at = now(), is_locked = true, updated_at = now() WHERE id = ${evaluationId} RETURNING id, is_locked`
    return c.json({ id: locked[0].id, is_locked: true })
  }
  return c.json({ id: evaluationId, is_locked: false })
})

router.get('/mine/:candidateId', requireRole('jury'), async (c) => {
  const juryId = c.get('user').id
  const candidateId = c.req.param('candidateId')
  const db = c.get('db')
  const rows = await db`SELECT id, is_locked, submitted_at FROM evaluations WHERE candidate_id = ${candidateId} AND jury_id = ${juryId} LIMIT 1`
  const evaluation = rows[0]
  if (!evaluation) return sendError(c, ERRORS.NOT_FOUND)
  const scores = await db`SELECT criterion_id, score FROM evaluation_scores WHERE evaluation_id = ${evaluation.id}`
  const notes = await db`SELECT type, content FROM evaluation_notes WHERE evaluation_id = ${evaluation.id}`
  return c.json({ ...evaluation, scores, notes })
})

export default router
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/evaluations.routes.test.js`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/routes/evaluations.js api/test/evaluations.routes.test.js
git commit -m "feat(api): add jury evaluation submit/lock routes"
```

---

## Task 14: Votes route (paid vote, simulated payment)

**Files:**
- Create: `api/src/routes/votes.js`
- Test: `api/test/votes.routes.test.js`

**Interfaces:**
- Consumes: `sendError`/`ERRORS` (Task 2), `db` from context.
- Produces: a Hono router mounted at `/votes`:
  - `POST /votes` — public. Body `{ candidate_id, quantity }`. Reads `settings.vote_unit_price`/`currency`, computes `total_amount = unit_price × quantity`, inserts a `votes` row with `payment_status = 'simulated'`. 400 if `quantity` not a positive integer. Returns 201 `{ id, quantity, total_amount, currency, payment_status }`.

- [ ] **Step 1: Write the failing test**

`api/test/votes.routes.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { buildTestApp } from './helpers.js'
import votesRouter from '../src/routes/votes.js'

describe('votes route', () => {
  it('creates a simulated vote and computes the total', async () => {
    const db = (strings, ...params) => {
      const sql = strings.join('?')
      if (sql.includes('FROM settings')) return Promise.resolve([{ vote_unit_price: 100, currency: 'XOF' }])
      if (sql.includes('INSERT INTO votes')) {
        return Promise.resolve([{ id: 'v1', quantity: 5, total_amount: 500, currency: 'XOF', payment_status: 'simulated' }])
      }
      return Promise.resolve([])
    }
    const app = buildTestApp({ db }, (a) => a.route('/votes', votesRouter))
    const res = await app.request('/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: 'c1', quantity: 5 }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.total_amount).toBe(500)
    expect(body.payment_status).toBe('simulated')
  })

  it('rejects a non-positive quantity', async () => {
    const db = () => Promise.resolve([{ vote_unit_price: 100, currency: 'XOF' }])
    const app = buildTestApp({ db }, (a) => a.route('/votes', votesRouter))
    const res = await app.request('/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: 'c1', quantity: 0 }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects a missing candidate_id', async () => {
    const db = () => Promise.resolve([{ vote_unit_price: 100, currency: 'XOF' }])
    const app = buildTestApp({ db }, (a) => a.route('/votes', votesRouter))
    const res = await app.request('/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 3 }),
    })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/votes.routes.test.js`
Expected: FAIL — cannot find module `../src/routes/votes.js`.

- [ ] **Step 3: Implement the votes router**

`api/src/routes/votes.js`:
```js
import { Hono } from 'hono'
import { sendError, ERRORS } from '../lib/errors.js'

const router = new Hono()

router.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const candidateId = body.candidate_id
  const quantity = Number(body.quantity)
  if (!candidateId) return sendError(c, ERRORS.VALIDATION, 'candidate_id requis')
  if (!Number.isInteger(quantity) || quantity <= 0) return sendError(c, ERRORS.VALIDATION, 'Quantité invalide')

  const db = c.get('db')
  const settingsRows = await db`SELECT vote_unit_price, currency FROM settings WHERE id = 1`
  const { vote_unit_price: unitPrice, currency } = settingsRows[0]
  const totalAmount = Number(unitPrice) * quantity

  const rows = await db`
    INSERT INTO votes (candidate_id, quantity, unit_price, total_amount, currency, payment_status)
    VALUES (${candidateId}, ${quantity}, ${unitPrice}, ${totalAmount}, ${currency}, 'simulated')
    RETURNING id, quantity, total_amount, currency, payment_status`
  return c.json(rows[0], 201)
})

export default router
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/votes.routes.test.js`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/routes/votes.js api/test/votes.routes.test.js
git commit -m "feat(api): add paid vote route with simulated payment"
```

---

## Task 15: Settings routes

**Files:**
- Create: `api/src/routes/settings.js`
- Test: `api/test/settings.routes.test.js`

**Interfaces:**
- Consumes: `requireRole` (Task 7), `sendError`/`ERRORS` (Task 2), `db` from context.
- Produces: a Hono router mounted at `/settings`:
  - `GET /settings` — public, returns `{ vote_weight_percentage, jury_weight_percentage, vote_unit_price, currency }`.
  - `PATCH /settings` — admin only, partial update of the same fields. Rejects with 400 if the resulting `vote_weight_percentage + jury_weight_percentage !== 100`.

- [ ] **Step 1: Write the failing test**

`api/test/settings.routes.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { buildTestApp } from './helpers.js'
import settingsRouter from '../src/routes/settings.js'
import { signToken } from '../src/lib/jwt.js'

async function adminHeaders() {
  const token = await signToken({ sub: 'a1', role: 'admin' }, 'test-secret')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

const currentSettings = { vote_weight_percentage: 50, jury_weight_percentage: 50, vote_unit_price: 100, currency: 'XOF' }

describe('settings routes', () => {
  it('GET is public', async () => {
    const db = () => Promise.resolve([currentSettings])
    const app = buildTestApp({ db }, (a) => a.route('/settings', settingsRouter))
    const res = await app.request('/settings')
    expect(res.status).toBe(200)
    expect((await res.json()).currency).toBe('XOF')
  })

  it('rejects weights that do not sum to 100', async () => {
    const db = () => Promise.resolve([currentSettings])
    const app = buildTestApp({ db }, (a) => a.route('/settings', settingsRouter))
    const res = await app.request('/settings', {
      method: 'PATCH',
      headers: await adminHeaders(),
      body: JSON.stringify({ vote_weight_percentage: 70, jury_weight_percentage: 40 }),
    })
    expect(res.status).toBe(400)
  })

  it('updates when weights sum to 100', async () => {
    const db = (strings) => {
      if (strings.join('?').includes('UPDATE settings')) {
        return Promise.resolve([{ vote_weight_percentage: 70, jury_weight_percentage: 30, vote_unit_price: 100, currency: 'XOF' }])
      }
      return Promise.resolve([currentSettings])
    }
    const app = buildTestApp({ db }, (a) => a.route('/settings', settingsRouter))
    const res = await app.request('/settings', {
      method: 'PATCH',
      headers: await adminHeaders(),
      body: JSON.stringify({ vote_weight_percentage: 70, jury_weight_percentage: 30 }),
    })
    expect(res.status).toBe(200)
    expect((await res.json()).vote_weight_percentage).toBe(70)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/settings.routes.test.js`
Expected: FAIL — cannot find module `../src/routes/settings.js`.

- [ ] **Step 3: Implement the settings router**

`api/src/routes/settings.js`:
```js
import { Hono } from 'hono'
import { requireRole } from '../middleware/auth.js'
import { sendError, ERRORS } from '../lib/errors.js'

const router = new Hono()

router.get('/', async (c) => {
  const db = c.get('db')
  const rows = await db`SELECT vote_weight_percentage, jury_weight_percentage, vote_unit_price, currency FROM settings WHERE id = 1`
  return c.json(rows[0])
})

router.patch('/', requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const db = c.get('db')
  const currentRows = await db`SELECT vote_weight_percentage, jury_weight_percentage, vote_unit_price, currency FROM settings WHERE id = 1`
  const current = currentRows[0]

  const voteWeight = body.vote_weight_percentage ?? current.vote_weight_percentage
  const juryWeight = body.jury_weight_percentage ?? current.jury_weight_percentage
  if (Number(voteWeight) + Number(juryWeight) !== 100) {
    return sendError(c, ERRORS.VALIDATION, 'La somme des pondérations vote et jury doit valoir 100')
  }

  const unitPrice = body.vote_unit_price ?? current.vote_unit_price
  const currency = body.currency ?? current.currency

  const rows = await db`
    UPDATE settings SET
      vote_weight_percentage = ${voteWeight},
      jury_weight_percentage = ${juryWeight},
      vote_unit_price = ${unitPrice},
      currency = ${currency},
      updated_at = now()
    WHERE id = 1
    RETURNING vote_weight_percentage, jury_weight_percentage, vote_unit_price, currency`
  return c.json(rows[0])
})

export default router
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/settings.routes.test.js`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/routes/settings.js api/test/settings.routes.test.js
git commit -m "feat(api): add settings routes with weight-sum validation"
```

---

## Task 16: Dashboard route (aggregates + ranking)

**Files:**
- Create: `api/src/routes/dashboard.js`
- Test: `api/test/dashboard.routes.test.js`

**Interfaces:**
- Consumes: `requireRole` (Task 7), `computeRanking` (Task 8), `db` from context.
- Produces: a Hono router mounted at `/dashboard`:
  - `GET /dashboard` — admin only. Loads candidates, criteria, locked+unlocked evaluations, evaluation scores, per-candidate vote totals (sum of quantity), total revenue (sum of total_amount), and settings; returns `{ totals: { votes, revenue, currency }, ranking: RankedCandidate[] }` where `ranking` comes from `computeRanking`.

- [ ] **Step 1: Write the failing test**

`api/test/dashboard.routes.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { buildTestApp } from './helpers.js'
import dashboardRouter from '../src/routes/dashboard.js'
import { signToken } from '../src/lib/jwt.js'

async function adminHeader() {
  const token = await signToken({ sub: 'a1', role: 'admin' }, 'test-secret')
  return `Bearer ${token}`
}

function db(strings) {
  const sql = strings.join('?')
  if (sql.includes('FROM candidates')) return Promise.resolve([{ id: 'c1', full_name: 'A' }, { id: 'c2', full_name: 'B' }])
  if (sql.includes('FROM criteria')) return Promise.resolve([{ id: 'cr1', weight_percentage: 100 }])
  if (sql.includes('FROM evaluations')) return Promise.resolve([{ id: 'e1', candidate_id: 'c1', is_locked: true }])
  if (sql.includes('FROM evaluation_scores')) return Promise.resolve([{ evaluation_id: 'e1', criterion_id: 'cr1', score: 90 }])
  if (sql.includes('GROUP BY candidate_id')) return Promise.resolve([{ candidate_id: 'c1', votes: 3 }, { candidate_id: 'c2', votes: 6 }])
  if (sql.includes('SUM(total_amount)')) return Promise.resolve([{ revenue: 900 }])
  if (sql.includes('FROM settings')) return Promise.resolve([{ vote_weight_percentage: 50, jury_weight_percentage: 50, currency: 'XOF' }])
  return Promise.resolve([])
}

describe('dashboard route', () => {
  it('returns totals and ranking for admin', async () => {
    const app = buildTestApp({ db }, (a) => a.route('/dashboard', dashboardRouter))
    const res = await app.request('/dashboard', { headers: { Authorization: await adminHeader() } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totals).toEqual({ votes: 9, revenue: 900, currency: 'XOF' })
    expect(body.ranking).toHaveLength(2)
    expect(body.ranking[0].id).toBe('c1') // higher final score (jury 90 + votes)
  })

  it('requires admin', async () => {
    const app = buildTestApp({ db }, (a) => a.route('/dashboard', dashboardRouter))
    const res = await app.request('/dashboard')
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/dashboard.routes.test.js`
Expected: FAIL — cannot find module `../src/routes/dashboard.js`.

- [ ] **Step 3: Implement the dashboard router**

`api/src/routes/dashboard.js`:
```js
import { Hono } from 'hono'
import { requireRole } from '../middleware/auth.js'
import { computeRanking } from '../lib/scoring.js'

const router = new Hono()

router.get('/', requireRole('admin'), async (c) => {
  const db = c.get('db')

  const candidates = await db`SELECT id, full_name FROM candidates`
  const criteria = await db`SELECT id, weight_percentage FROM criteria`
  const evaluations = await db`SELECT id, candidate_id, is_locked FROM evaluations`
  const evaluationScores = await db`SELECT evaluation_id, criterion_id, score FROM evaluation_scores`
  const voteTotals = await db`SELECT candidate_id, COALESCE(SUM(quantity), 0) AS votes FROM votes GROUP BY candidate_id`
  const revenueRows = await db`SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM votes`
  const settingsRows = await db`SELECT vote_weight_percentage, jury_weight_percentage, currency FROM settings WHERE id = 1`
  const settings = settingsRows[0]

  const totalVotes = voteTotals.reduce((acc, v) => acc + Number(v.votes), 0)
  const ranking = computeRanking({ candidates, criteria, evaluations, evaluationScores, voteTotals, settings })

  return c.json({
    totals: { votes: totalVotes, revenue: Number(revenueRows[0].revenue), currency: settings.currency },
    ranking,
  })
})

export default router
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/dashboard.routes.test.js`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/routes/dashboard.js api/test/dashboard.routes.test.js
git commit -m "feat(api): add admin dashboard aggregates and ranking"
```

---

## Task 17: Wire the full app (CORS + mount all routers) + deploy notes

**Files:**
- Modify: `api/src/app.js`
- Modify: `api/src/index.js`
- Create: `api/README.md`
- Test: `api/test/app.wiring.test.js`

**Interfaces:**
- Consumes: every router (Tasks 9–16), `contextMiddleware` (Task 6).
- Produces: `createApp({ withContext = true } = {})` — mounts CORS, the context middleware (skippable in tests), and all routers on their paths: `/` (auth), `/candidates`, `/candidates/:candidateId/photos`, `/criteria`, `/evaluations`, `/votes`, `/settings`, `/dashboard`. `index.js` exports the production app. A catch-all returns the uniform 404 error shape.

- [ ] **Step 1: Write the failing wiring test**

`api/test/app.wiring.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { createApp } from '../src/app.js'

describe('app wiring', () => {
  it('serves health without context middleware', async () => {
    const app = createApp({ withContext: false })
    const res = await app.request('/health')
    expect(res.status).toBe(200)
  })

  it('returns the uniform 404 shape for unknown routes', async () => {
    const app = createApp({ withContext: false })
    const res = await app.request('/nope')
    expect(res.status).toBe(404)
    expect((await res.json()).error.code).toBe('not_found')
  })

  it('adds permissive CORS headers', async () => {
    const app = createApp({ withContext: false })
    const res = await app.request('/health', { headers: { Origin: 'https://awac.vercel.app' } })
    expect(res.headers.get('access-control-allow-origin')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npx vitest run test/app.wiring.test.js`
Expected: FAIL — `createApp` does not accept options / CORS + 404 not present yet.

- [ ] **Step 3: Rewrite the app factory to mount everything**

`api/src/app.js`:
```js
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { contextMiddleware } from './middleware/context.js'
import { sendError, ERRORS } from './lib/errors.js'
import authRouter from './routes/auth.js'
import candidatesRouter from './routes/candidates.js'
import photosRouter from './routes/photos.js'
import criteriaRouter from './routes/criteria.js'
import evaluationsRouter from './routes/evaluations.js'
import votesRouter from './routes/votes.js'
import settingsRouter from './routes/settings.js'
import dashboardRouter from './routes/dashboard.js'

export function createApp({ withContext = true } = {}) {
  const app = new Hono()

  app.use('*', cors())
  app.get('/health', (c) => c.json({ status: 'ok' }))

  if (withContext) app.use('*', contextMiddleware)

  app.route('/', authRouter)
  app.route('/candidates', candidatesRouter)
  app.route('/candidates/:candidateId/photos', photosRouter)
  app.route('/criteria', criteriaRouter)
  app.route('/evaluations', evaluationsRouter)
  app.route('/votes', votesRouter)
  app.route('/settings', settingsRouter)
  app.route('/dashboard', dashboardRouter)

  app.notFound((c) => sendError(c, ERRORS.NOT_FOUND))
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: { code: 'internal_error', message: 'Une erreur interne est survenue' } }, 500)
  })

  return app
}
```

`api/src/index.js` (unchanged behavior, but confirm it uses the default options):
```js
import { createApp } from './app.js'

const app = createApp()

export default app
```

- [ ] **Step 4: Write the deploy README**

`api/README.md`:
````markdown
# awac API (Cloudflare Worker)

Hono API backed by Neon Postgres and Cloudflare R2. Replaces Supabase.

## Local dev

1. Copy env template and fill real values (from the Neon console + a random JWT secret):
   ```bash
   cp .dev.vars.example .dev.vars
   ```
2. Apply the schema to your Neon branch:
   ```bash
   npm run migrate
   ```
3. Run tests:
   ```bash
   npm test
   ```
4. Run the Worker locally:
   ```bash
   npm run dev
   ```

## Deploy (Cloudflare)

Prerequisites (one-time, via the Cloudflare dashboard or `wrangler`):
- Create the R2 bucket `awac-photos` and enable public access; put its public URL in `wrangler.toml` `[vars] R2_PUBLIC_URL`.
- Set secrets:
  ```bash
  npx wrangler secret put DATABASE_URL
  npx wrangler secret put JWT_SECRET
  ```
Then:
```bash
npm run deploy
```

## Seeding the first admin

There is no public admin sign-up. Create the first admin by hashing a password
and inserting a row. Run this once locally (uses .dev.vars DATABASE_URL):
```bash
node scripts/seed-admin.js "admin@example.com" "Nom Admin" "motdepasse"
```
(See scripts/seed-admin.js — added in Task 18.)
````

- [ ] **Step 5: Run the full API test suite**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npm test`
Expected: all test files pass (health, errors, password, jwt, context, auth.middleware, scoring, auth.routes, candidates.routes, photos.routes, criteria.routes, evaluations.routes, votes.routes, settings.routes, dashboard.routes, app.wiring).

- [ ] **Step 6: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/src/app.js api/src/index.js api/README.md api/test/app.wiring.test.js
git commit -m "feat(api): wire CORS, mount all routers, uniform 404/500"
```

---

## Task 18: Seed-admin script + verify against real Neon

**Files:**
- Create: `api/scripts/seed-admin.js`

**Interfaces:**
- Produces: `node scripts/seed-admin.js <email> <full_name> <password>` — hashes the password with `hashPassword` and inserts (or updates) an `admins` row using `DATABASE_URL` from `.dev.vars`.

- [ ] **Step 1: Write the seed script**

`api/scripts/seed-admin.js`:
```js
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'
import { hashPassword } from '../src/lib/password.js'

const here = dirname(fileURLToPath(import.meta.url))

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const raw = readFileSync(join(here, '..', '.dev.vars'), 'utf8')
  const match = raw.match(/^\s*DATABASE_URL\s*=\s*"?(.*?)"?\s*$/m)
  if (!match) throw new Error('DATABASE_URL introuvable dans .dev.vars')
  return match[1]
}

async function main() {
  const [email, fullName, password] = process.argv.slice(2)
  if (!email || !fullName || !password) {
    console.error('Usage: node scripts/seed-admin.js <email> <full_name> <password>')
    process.exit(1)
  }
  const hash = await hashPassword(password)
  const client = new pg.Client({ connectionString: loadDatabaseUrl() })
  await client.connect()
  await client.query(
    `INSERT INTO admins (email, full_name, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash`,
    [email, fullName, hash],
  )
  await client.end()
  console.log(`Admin enregistré : ${email}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
```

- [ ] **Step 2: Create the first admin against Neon**

Run (replace with a real password):
```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && node scripts/seed-admin.js "admin@awac.local" "Organisateur" "change-me-strong"
```
Expected: `Admin enregistré : admin@awac.local`.

- [ ] **Step 3: Smoke-test login against the running Worker**

In one terminal: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac/api" && npm run dev`
In another:
```bash
curl -s -X POST http://localhost:8787/auth/login/admin -H 'Content-Type: application/json' -d '{"email":"admin@awac.local","password":"change-me-strong"}'
```
Expected: JSON containing a `token` and `"role":"admin"`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add api/scripts/seed-admin.js
git commit -m "feat(api): add seed-admin script"
```

---

## Task 19: Frontend API client

**Files:**
- Create: `src/services/api.js`
- Test: `src/services/api.test.js`
- Modify: `package.json` (add Vitest + test script for the SPA)
- Create: `vitest.config.js` (SPA root)

**Interfaces:**
- Produces: `apiClient` with:
  - `setToken(token | null)` / `getToken()` — persists the JWT in `localStorage` under `awac_token`.
  - `async request(path, { method, body, auth } = {})` — prepends `VITE_API_BASE_URL`, sets `Content-Type: application/json` for JSON bodies, adds `Authorization: Bearer <token>` when `auth !== false` and a token exists, parses JSON, and throws `ApiError { code, message, status }` on non-2xx using the `{ error: { code, message } }` shape.
  - Convenience: `get`, `post`, `patch`, `del`.
- Produces: `ApiError` class.

- [ ] **Step 1: Add Vitest to the SPA**

Modify `package.json` — add to `scripts`:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```
Add to `devDependencies`:
```json
    "vitest": "^2.1.8",
    "jsdom": "^25.0.1"
```

Create `vitest.config.js` at the SPA root:
```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
})
```

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac" && npm install`
Expected: installs vitest + jsdom.

- [ ] **Step 2: Write the failing test**

`src/services/api.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, ApiError } from './api.js'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  import.meta.env.VITE_API_BASE_URL = 'https://api.test'
})

describe('apiClient', () => {
  it('stores and retrieves the token', () => {
    apiClient.setToken('abc')
    expect(apiClient.getToken()).toBe('abc')
    expect(localStorage.getItem('awac_token')).toBe('abc')
    apiClient.setToken(null)
    expect(apiClient.getToken()).toBeNull()
  })

  it('sends Authorization when a token is set', async () => {
    apiClient.setToken('tok')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await apiClient.get('/dashboard')
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBe('Bearer tok')
  })

  it('throws ApiError with the code from the error body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'invalid_credentials', message: 'Nope' } }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await expect(apiClient.post('/auth/login/admin', { email: 'x', password: 'y' }, { auth: false }))
      .rejects.toMatchObject({ code: 'invalid_credentials', status: 401 })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac" && npx vitest run src/services/api.test.js`
Expected: FAIL — cannot find module `./api.js`.

- [ ] **Step 4: Implement the client**

`src/services/api.js`:
```js
const TOKEN_KEY = 'awac_token'

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message)
    this.code = code
    this.status = status
  }
}

function baseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? ''
}

export const apiClient = {
  setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  },
  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },
  async request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = {}
    let payload
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
    const token = this.getToken()
    if (auth && token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${baseUrl()}${path}`, { method, headers, body: payload })
    const isJson = (res.headers.get('Content-Type') ?? '').includes('application/json')
    const data = isJson ? await res.json() : null

    if (!res.ok) {
      const err = data?.error ?? { code: 'unknown', message: 'Erreur réseau' }
      throw new ApiError(err.code, err.message, res.status)
    }
    return data
  },
  get(path, opts) {
    return this.request(path, { ...opts, method: 'GET' })
  },
  post(path, body, opts) {
    return this.request(path, { ...opts, method: 'POST', body })
  },
  patch(path, body, opts) {
    return this.request(path, { ...opts, method: 'PATCH', body })
  },
  del(path, opts) {
    return this.request(path, { ...opts, method: 'DELETE' })
  },
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac" && npx vitest run src/services/api.test.js`
Expected: PASS (3 passed).

- [ ] **Step 6: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add package.json package-lock.json vitest.config.js src/services/api.js src/services/api.test.js
git commit -m "feat(web): add API client with bearer-token auth and Vitest"
```

---

## Task 20: Rewire auth (authService + userStore + router) and remove Supabase

**Files:**
- Modify: `src/services/authService.js`
- Modify: `src/stores/userStore.js`
- Modify: `src/router/index.js`
- Delete: `src/services/supabase.js`
- Delete: `src/test-supabase.js`
- Modify: `package.json` (remove `@supabase/supabase-js`)
- Test: `src/stores/userStore.test.js`

**Interfaces:**
- Consumes: `apiClient`, `ApiError` (Task 19).
- Produces: `authService` — `loginAdmin(email, password)`, `loginJury(username, password)` (both call the API, store the token, return `user`), `logout()` (clears token), `getStoredUser()` (decodes role from the stored JWT payload without verifying — display only).
- Produces: `useUserStore` (Pinia) — state `{ user, role, isLoading, error }`; getters `isAuthenticated`, `isAdmin`, `isJury`; actions `loginAdmin`, `loginJury`, `logout`, `restore()` (rehydrates `role` from a stored token on app load).
- Router guard: `requiresAuth` → redirect to `/admin/login` (admin routes) or `/jury/login` (jury routes) when no token; `requiresAdmin` → must be `admin`; jury routes → must be `jury`.

- [ ] **Step 1: Write the failing store test**

`src/stores/userStore.test.js`:
```js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from './userStore.js'
import { apiClient } from '../services/api.js'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useUserStore', () => {
  it('loginAdmin stores the user and marks admin', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      token: 'tok', user: { id: 'a1', role: 'admin', full_name: 'Boss' },
    })
    const store = useUserStore()
    await store.loginAdmin('boss@x.com', 'pw')
    expect(store.isAuthenticated).toBe(true)
    expect(store.isAdmin).toBe(true)
    expect(store.user.full_name).toBe('Boss')
  })

  it('logout clears state and token', async () => {
    apiClient.setToken('tok')
    const store = useUserStore()
    store.user = { id: 'a1', full_name: 'Boss' }
    store.role = 'admin'
    store.logout()
    expect(store.isAuthenticated).toBe(false)
    expect(apiClient.getToken()).toBeNull()
  })

  it('surfaces the error message on failed login', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(Object.assign(new Error('Nope'), { code: 'invalid_credentials' }))
    const store = useUserStore()
    await expect(store.loginJury('x', 'y')).rejects.toBeTruthy()
    expect(store.error).toBe('Nope')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac" && npx vitest run src/stores/userStore.test.js`
Expected: FAIL — `userStore.js` still imports the deleted Supabase service / new API not present.

- [ ] **Step 3: Rewrite authService**

`src/services/authService.js`:
```js
import { apiClient } from './api.js'

function decodeRole() {
  const token = apiClient.getToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { id: payload.sub, role: payload.role }
  } catch {
    return null
  }
}

export const authService = {
  async loginAdmin(email, password) {
    const { token, user } = await apiClient.post('/auth/login/admin', { email, password }, { auth: false })
    apiClient.setToken(token)
    return user
  },
  async loginJury(username, password) {
    const { token, user } = await apiClient.post('/auth/login/jury', { username, password }, { auth: false })
    apiClient.setToken(token)
    return user
  },
  logout() {
    apiClient.setToken(null)
  },
  getStoredUser() {
    return decodeRole()
  },
}
```

- [ ] **Step 4: Rewrite userStore**

`src/stores/userStore.js`:
```js
import { defineStore } from 'pinia'
import { authService } from '@/services/authService'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    role: null,
    isLoading: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.role,
    isAdmin: (state) => state.role === 'admin',
    isJury: (state) => state.role === 'jury',
    userFullName: (state) => state.user?.full_name ?? 'Utilisateur',
  },
  actions: {
    async loginAdmin(email, password) {
      this.isLoading = true
      this.error = null
      try {
        const user = await authService.loginAdmin(email, password)
        this.user = user
        this.role = user.role
        return user
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },
    async loginJury(username, password) {
      this.isLoading = true
      this.error = null
      try {
        const user = await authService.loginJury(username, password)
        this.user = user
        this.role = user.role
        return user
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },
    logout() {
      authService.logout()
      this.user = null
      this.role = null
    },
    restore() {
      const stored = authService.getStoredUser()
      this.role = stored?.role ?? null
    },
  },
})
```

- [ ] **Step 5: Rewrite the router guard**

`src/router/index.js`:
```js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useUserStore } from '@/stores/userStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/admin/login', name: 'admin-login', component: () => import('@/views/Login.vue'), meta: { requiresGuest: true } },
    { path: '/jury/login', name: 'jury-login', component: () => import('@/views/Login.vue'), meta: { requiresGuest: true } },
    {
      path: '/admin',
      component: () => import('@/views/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '', component: () => import('@/views/admin/dashboard/index.vue') },
        { path: 'candidates', component: () => import('@/views/admin/candidates/index.vue') },
        { path: 'criteria', component: () => import('@/views/admin/criteria/index.vue') },
        { path: 'users', component: () => import('@/views/admin/users/index.vue') },
        { path: 'settings', component: () => import('@/views/admin/settings/index.vue') },
      ],
    },
    {
      path: '/jury',
      component: () => import('@/layouts/JuryLayout.vue'),
      meta: { requiresAuth: true, requiresJury: true },
      children: [
        { path: '', component: () => import('@/views/jury/evaluate.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const store = useUserStore()
  if (!store.role) store.restore()

  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const requiresGuest = to.matched.some((r) => r.meta.requiresGuest)
  const requiresAdmin = to.matched.some((r) => r.meta.requiresAdmin)
  const requiresJury = to.matched.some((r) => r.meta.requiresJury)

  if (requiresAuth && !store.isAuthenticated) {
    return to.path.startsWith('/jury') ? '/jury/login' : '/admin/login'
  }
  if (requiresGuest && store.isAuthenticated) {
    return store.isAdmin ? '/admin' : '/jury'
  }
  if (requiresAdmin && !store.isAdmin) return '/admin/login'
  if (requiresJury && !store.isJury) return '/jury/login'
  return true
})

export default router
```

- [ ] **Step 6: Delete Supabase files and dependency**

Run:
```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git rm src/services/supabase.js src/test-supabase.js
npm uninstall @supabase/supabase-js
```
Expected: files removed, dependency dropped from `package.json`.

- [ ] **Step 7: Verify no remaining Supabase imports**

Run:
```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac" && grep -rn "supabase" src/ || echo "NO SUPABASE REFERENCES"
```
Expected: `NO SUPABASE REFERENCES`. If any appear (e.g. in `src/services/juryService.js`, `src/composables/usePermissions.js`, or admin/jury views), note them — those files belong to follow-on screen-rebuild plans and, if they block the build, stub their Supabase calls to throw `new Error('à réimplémenter contre la nouvelle API')` so the app still compiles. Do not delete the view files.

- [ ] **Step 8: Run the store test**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac" && npx vitest run src/stores/userStore.test.js`
Expected: PASS (3 passed).

- [ ] **Step 9: Confirm the SPA builds**

Run: `cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac" && npm run build`
Expected: build succeeds with no unresolved `@supabase/supabase-js` import. If it fails on a leftover Supabase import in a view/composable outside this plan's scope, apply the stub from Step 7 to that file and re-run.

- [ ] **Step 10: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add -A
git commit -m "feat(web): rewire auth to the new API and remove Supabase"
```

---

## Task 21: Frontend environment + integration doc

**Files:**
- Create: `.env.example` (SPA root)
- Modify: `CLAUDE.md` (update stack + add API workspace pointer)

**Interfaces:** none (documentation/config).

- [ ] **Step 1: Add the SPA env template**

`.env.example`:
```
VITE_API_BASE_URL="http://localhost:8787"
```

Confirm `.gitignore` already ignores `.env` (it does per the existing repo). Do NOT commit a real `.env`.

- [ ] **Step 2: Update CLAUDE.md stack + structure sections**

In `CLAUDE.md`, replace the "Stack" bullet about Supabase and add an API pointer. Apply these two edits:

Replace:
```
Vue 3 (Composition API) + Vite, Vue Router, Pinia, Tailwind CSS, Supabase (Postgres + Auth + Storage), Chart.js/vue-chartjs, GSAP.
```
with:
```
Vue 3 (Composition API) + Vite, Vue Router, Pinia, Tailwind CSS, Chart.js/vue-chartjs, GSAP. Backend: separate `api/` Cloudflare Worker (Hono) over Neon Postgres + Cloudflare R2 — the SPA talks to it via `src/services/api.js` with a bearer JWT (no more Supabase).
```

Add a new section after the "### Stack" block:
```
### Backend API (`api/`)
Standalone Cloudflare Worker (Hono). Run `cd api && npm test` for API tests, `npm run dev` to serve locally on :8787, `npm run migrate` to apply the Neon schema. See `api/README.md`. Route handlers read `db`/`r2`/`jwtSecret` from Hono context (injected from `c.env`), which is what makes them unit-testable without a live DB. Auth is JWT (HS256) + PBKDF2 password hashing; roles are `admin` and `jury`.
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/emeric/Documents/PARTIE PRO/PROJET WEB/awac"
git add .env.example CLAUDE.md
git commit -m "docs(web): add API env template and update CLAUDE.md for the new stack"
```

---

## Deployment checklist (run after all tasks pass)

Not a code task — the operator performs these once to go live:

1. **Neon**: confirm the schema is applied to the production branch (`npm run migrate` against the prod `DATABASE_URL`).
2. **Cloudflare R2**: create bucket `awac-photos`, enable public access, copy its public URL into `wrangler.toml` `[vars] R2_PUBLIC_URL`.
3. **Cloudflare Worker secrets**: `wrangler secret put DATABASE_URL`, `wrangler secret put JWT_SECRET` (long random value).
4. **Deploy the Worker**: `cd api && npm run deploy`; note the deployed URL.
5. **Vercel (SPA)**: set `VITE_API_BASE_URL` to the deployed Worker URL in the Vercel project env; redeploy.
6. **Seed the first admin** against prod: `node scripts/seed-admin.js <email> <name> <password>`.
7. **Rotate** the old exposed Supabase `service_role` key (from the earlier incident) if the Supabase project is kept alive for any reason, then decommission the Supabase project.

---

## Self-Review Notes

- **Spec coverage:** auth (T9), authorization guard (T7), schema (T5), candidates+photos+R2 (T10, T11), criteria (T12), evaluations with lock + appreciations/faults (T13), paid vote simulated (T14), settings/weights (T15), combined ranking on read (T8, T16), uniform errors (T2), tests via Vitest (throughout), frontend client + auth rewire + Supabase removal (T19, T20, T21). Deploy/ops steps captured. ✔
- **Spec deviation (flagged):** password hashing uses **PBKDF2 (Web Crypto)** instead of bcrypt, because bcrypt exceeds the 10 ms CPU budget of the Workers free plan. Documented in Global Constraints and Task 3.
- **Scope boundary:** rebuilding individual admin/jury feature screens against the new schema is deferred to follow-on plans; Task 20 keeps the app building by stubbing any out-of-scope Supabase call sites rather than rebuilding those screens here.
- **Type consistency:** route handlers uniformly read `c.get('db')`/`c.get('r2')`/`c.get('user')`; `computeRanking`'s input shape in Task 8 matches the queries assembled in Task 16; `RankedCandidate` fields (`juryScore`, `voteScore`, `finalScore`, `totalVotes`) are consistent between Task 8 and Task 16.
