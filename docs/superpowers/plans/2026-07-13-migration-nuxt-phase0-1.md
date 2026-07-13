# Migration Nuxt — Phase 0 (Scaffold) + Phase 1 (API → server/) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser un projet Nuxt 4 dans le repo et y porter l'API Hono (`api/`) sous forme de routes Nitro (`server/api/`), un seul serveur, secrets serveur-only, avec tous les tests verts.

**Architecture:** Nuxt 4 (moteur Nitro). Le front reste minimal à ce stade (scaffold). L'API est portée en handlers H3 **minces** posés au-dessus de **services purs** (`server/services/`) qui renvoient `{ status, body }`. Les libs framework-agnostiques (`sebpay`, `voteConfirmation`, `errors`) sont copiées quasi telles quelles. Les fakes de test existants (`recordingDb`, `makeDb`) sont réutilisés en testant les services directement.

**Tech Stack:** Nuxt 4.4, Nitro/H3, `@pinia/nuxt`, `@nuxtjs/tailwindcss`, `@nuxtjs/supabase`, `postgres` (Neon), Vitest, TypeScript strict.

## Global Constraints

- **Node** ≥ 20 (env actuel: v25). **Nuxt** `^4.4.8`, **@nuxtjs/supabase** `^2.0.9`, **@pinia/nuxt** `^0.11.3`, **@nuxtjs/tailwindcss** `^6.14.0`.
- **TypeScript strict** partout ; `noUncheckedIndexedAccess` activé (comme `api/tsconfig.json` actuel). Pas de `as any`, pas de `@ts-ignore` non documenté.
- **Le client Supabase `service_role` ne doit JAMAIS être importé depuis `app/`** — uniquement `server/`. La clé passe en variable serveur-only (runtime config privée), plus de préfixe `VITE_`.
- **Logique paiement critique conservée à l'identique** : vérification signature webhook (HMAC + `timingSafeEqual`) et idempotence transactionnelle de `voteConfirmation` — ne pas réécrire.
- **Le site vitrine n'est PAS touché dans ce plan** (phases 2-4). `src/` reste en place et fonctionnel jusqu'à la phase de nettoyage.
- Nommage: `camelCase` fonctions/variables, `PascalCase` types, `SNAKE_UPPER_CASE` constantes. Fichiers < 300 lignes, fonctions < 50 lignes.
- **Commits fréquents**, un par task minimum, format conventional commits (`type(scope): sujet`).

---

## File Structure

Créés par ce plan :
- `nuxt.config.ts` — config Nuxt (modules, runtimeConfig, srcDir).
- `app/app.vue` — racine Nuxt (placeholder à ce stade).
- `app/pages/index.vue` — page temporaire de scaffold (remplacée en phase 2).
- `app/assets/css/tailwind.css` — entrée Tailwind.
- `tailwind.config.ts` — config Tailwind (tokens awac, scan `app/`).
- `server/tsconfig.json` — hérite de la config Nitro générée.
- `server/lib/errors.ts` — entrées d'erreur + `HttpResult` helpers (`ok`/`fail`).
- `server/lib/sebpay.ts` — copié depuis `api/src/lib/sebpay.ts` (verbatim).
- `server/lib/db.ts` — `getDb()` (copié/adapté depuis `api/src/db.ts`).
- `server/types.ts` — types SebPay + `PaymentConfig` (copié depuis `api/src/types.ts`, sans `AppEnv`).
- `server/services/voteConfirmation.ts` — copié depuis `api/src/services/voteConfirmation.ts` (verbatim, adapte import).
- `server/services/candidates.ts` — `listCandidates`, `getCandidateWithPhotos`, `isUuid`.
- `server/services/settings.ts` — `getPublicSettings`.
- `server/services/payment.ts` — `getCountriesList`, `getOperatorsList` (+ cache).
- `server/services/votes.ts` — `submitVote`, `getVoteStatus`, `processWebhook`.
- `server/utils/context.ts` — `getSebpay()`, `getSebpaySecret()`, `getPaymentConfig()` (runtime config → deps).
- `server/api/candidates/index.get.ts`, `server/api/candidates/[id].get.ts`
- `server/api/settings/public.get.ts`
- `server/api/payment/countries.get.ts`, `server/api/payment/operators.get.ts`
- `server/api/votes/index.post.ts`, `server/api/votes/[id]/status.get.ts`, `server/api/votes/webhook.post.ts`
- `test/server/helpers.ts` — `recordingDb`, `makeDb` fakes (portés depuis `api/test/helpers.ts`, sans buildTestApp).
- `test/server/*.test.ts` — tests services (portés depuis `api/test/`).
- `vitest.config.ts` (racine) — config vitest pointant `test/server/`.

Supprimés en fin de plan (Task 12) :
- `api/` (tout le dossier Hono), `api/src/app.ts`, `server.ts`, dépendance `@hono/node-server`, `hono`.

Non touchés : `src/` (front actuel), `supabase/`, `public/`.

---

## Phase 0 — Scaffold

### Task 1: Bootstrap Nuxt à côté du code existant

**Files:**
- Create: `nuxt.config.ts`, `app/app.vue`, `app/pages/index.vue`
- Modify: `package.json` (deps + scripts)

**Interfaces:**
- Produces: projet Nuxt démarrable via `npm run dev` (port 3000), coexistant avec `src/` (non monté).

- [ ] **Step 1: Installer Nuxt et créer la config**

Run:
```bash
npm install nuxt@^4.4.8
```

Create `nuxt.config.ts`:
```ts
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-13',
  srcDir: 'app/',
  devtools: { enabled: true },
  modules: [],
  runtimeConfig: {
    // serveur-only (jamais dans le bundle client)
    databaseUrl: '',
    sebpayPublicKey: '',
    sebpaySecretKey: '',
    sebpayBaseUrl: '',
    sebpayCallbackUrl: '',
    supabaseServiceRoleKey: '',
    public: {
      // exposé au client
      supabaseUrl: '',
      supabaseAnonKey: '',
    },
  },
})
```

Create `app/app.vue`:
```vue
<template>
  <NuxtPage />
</template>
```

Create `app/pages/index.vue`:
```vue
<template>
  <main style="font-family: system-ui; padding: 2rem">
    <h1>AWAC — scaffold Nuxt</h1>
    <p>Migration en cours. Le site vitrine arrive en phase 2.</p>
  </main>
</template>
```

- [ ] **Step 2: Ajuster les scripts npm**

Modify `package.json` scripts (garder `format`) :
```json
"scripts": {
  "dev": "nuxt dev",
  "build": "nuxt build",
  "preview": "nuxt preview",
  "generate": "nuxt generate",
  "typecheck": "nuxt typecheck",
  "test": "vitest run",
  "format": "prettier --write --experimental-cli app/ server/"
}
```

- [ ] **Step 3: Vérifier que le serveur démarre**

Run:
```bash
npm run dev &
sleep 8
curl -s http://localhost:3000/ | grep -q "scaffold Nuxt" && echo "SCAFFOLD OK"
kill %1
```
Expected: `SCAFFOLD OK`

- [ ] **Step 4: Ignorer les artefacts Nuxt dans git**

Add to `.gitignore` (si absent) :
```
.nuxt
.output
.data
```

- [ ] **Step 5: Commit**

```bash
git add nuxt.config.ts app/ package.json package-lock.json .gitignore
git commit -m "feat(nuxt): scaffold Nuxt 4 à côté du front Vite existant"
```

---

### Task 2: Tailwind + tokens awac

**Files:**
- Create: `tailwind.config.ts`, `app/assets/css/tailwind.css`
- Modify: `nuxt.config.ts` (module + css)

**Interfaces:**
- Consumes: scaffold de la Task 1.
- Produces: classes `bg-awac-primary`, `font-heading` disponibles dans les composants Nuxt.

- [ ] **Step 1: Installer le module Tailwind**

Run:
```bash
npm install -D @nuxtjs/tailwindcss@^6.14.0
```

- [ ] **Step 2: Config Tailwind (reprend les tokens actuels, scan app/)**

Create `tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        awac: {
          primary: '#EF7952',
          secondary: '#F49537',
          accent: '#DF413A',
          dark: '#0B0B0B',
        },
      },
      fontFamily: {
        sans: ['Open Sans', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

Create `app/assets/css/tailwind.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Brancher le module dans nuxt.config.ts**

Modify `nuxt.config.ts` — `modules` et `css`:
```ts
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/tailwind.css'],
  tailwindcss: { configPath: '~~/tailwind.config.ts' },
```
(`~~` = racine du projet ; `~` = `srcDir` = `app/`.)

- [ ] **Step 4: Vérifier qu'une classe token s'applique**

Edit `app/pages/index.vue` template pour utiliser un token :
```vue
<template>
  <main class="p-8 font-heading text-awac-primary">
    <h1>AWAC — scaffold Nuxt</h1>
    <p class="font-sans text-awac-dark">Migration en cours. Le site vitrine arrive en phase 2.</p>
  </main>
</template>
```

Run:
```bash
npm run dev &
sleep 8
curl -s http://localhost:3000/_tailwind/ -o /dev/null -w "%{http_code}\n" 2>/dev/null || true
curl -s http://localhost:3000/ | grep -q "text-awac-primary" && echo "TAILWIND CLASSES OK"
kill %1
```
Expected: `TAILWIND CLASSES OK`

- [ ] **Step 5: Commit**

```bash
git add nuxt.config.ts tailwind.config.ts app/
git commit -m "feat(nuxt): intègre Tailwind avec les tokens awac"
```

---

### Task 3: Modules Pinia + Supabase et runtime config

**Files:**
- Modify: `nuxt.config.ts`
- Create: `.env` (local, non commité) — clés Supabase/SebPay/DB

**Interfaces:**
- Consumes: scaffold Tailwind.
- Produces: `useSupabaseClient()`/`useSupabaseUser()` disponibles ; runtime config serveur peuplée depuis l'env ; Pinia actif.

- [ ] **Step 1: Installer les modules**

Run:
```bash
npm install @pinia/nuxt@^0.11.3 pinia @nuxtjs/supabase@^2.0.9
```

- [ ] **Step 2: Brancher modules + mapping env → runtimeConfig**

Modify `nuxt.config.ts` :
```ts
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxtjs/supabase'],
  supabase: {
    // pas de redirection auto pour l'instant (auth traitée en phase 3)
    redirect: false,
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL ?? '',
    sebpayPublicKey: process.env.SEBPAY_PUBLIC_KEY ?? '',
    sebpaySecretKey: process.env.SEBPAY_SECRET_KEY ?? '',
    sebpayBaseUrl: process.env.SEBPAY_BASE_URL ?? '',
    sebpayCallbackUrl: process.env.SEBPAY_CALLBACK_URL ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    public: {
      supabaseUrl: process.env.SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.SUPABASE_KEY ?? '',
    },
  },
```
Note: `@nuxtjs/supabase` lit `SUPABASE_URL` et `SUPABASE_KEY` (anon) directement. Le client `service_role` sera obtenu via `serverSupabaseServiceRole(event)` côté serveur (phase 3), à partir de `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 3: Créer le `.env` local (repris de api/.env)**

Copier les valeurs depuis `api/.env` vers un `.env` à la racine, en renommant :
```
SUPABASE_URL=...
SUPABASE_KEY=<clé anon>
SUPABASE_SERVICE_ROLE_KEY=<clé service_role>   # ⚠️ à régénérer côté Supabase (exposée par le passé)
DATABASE_URL=...
SEBPAY_PUBLIC_KEY=...
SEBPAY_SECRET_KEY=...
SEBPAY_BASE_URL=...
SEBPAY_CALLBACK_URL=...
```
Vérifier que `.env` est bien dans `.gitignore` (ajouter si absent).

- [ ] **Step 4: Vérifier le démarrage sans fuite de secret**

Run:
```bash
npm run dev &
sleep 10
# le bundle client NE doit PAS contenir la clé service_role ni DATABASE_URL
curl -s http://localhost:3000/ > /tmp/nuxt_home.html
grep -qi "service_role\|DATABASE_URL\|SEBPAY_SECRET" /tmp/nuxt_home.html && echo "FUITE!" || echo "PAS DE FUITE OK"
kill %1
```
Expected: `PAS DE FUITE OK`

- [ ] **Step 5: Commit**

```bash
git add nuxt.config.ts .gitignore
git commit -m "feat(nuxt): active Pinia et Supabase, runtime config serveur-only"
```

---

## Phase 1 — API → server/

### Task 4: Porter les libs framework-agnostiques + leurs tests

**Files:**
- Create: `server/types.ts`, `server/lib/db.ts`, `server/lib/sebpay.ts`, `server/services/voteConfirmation.ts`
- Create: `vitest.config.ts`, `test/server/sebpay.test.ts`, `test/server/voteConfirmation.test.ts`
- Modify: `package.json` (deps `postgres`, `vitest`, `dotenv`)

**Interfaces:**
- Produces:
  - `getDb(): Db` (depuis `server/lib/db.ts`)
  - `verifyWebhookSignature(rawBody, signature, secret): boolean`, `createSebpayClient(config): SebpayClient`, `createSebpayFromEnv(env?): SebpayClient | null` (depuis `server/lib/sebpay.ts`)
  - `confirmVote(db, receiptCode, transactionId): Promise<VoteConfirmationResult>`, `rejectVote(db, receiptCode): Promise<VoteConfirmationResult>` (depuis `server/services/voteConfirmation.ts`)
  - types `Db`, `SebpayClient`, `SebpayCollection`, `SebpayCollectionInput`, `SebpayCountry`, `SebpayOperator`, `PaymentConfig` (depuis `server/types.ts`)

- [ ] **Step 1: Installer les deps serveur**

Run:
```bash
npm install postgres
npm install -D vitest dotenv
```

- [ ] **Step 2: Copier types, db, sebpay, voteConfirmation (verbatim, ajuster imports)**

Copier fichiers :
```bash
cp api/src/types.ts server/types.ts
cp api/src/lib/sebpay.ts server/lib/sebpay.ts
cp api/src/services/voteConfirmation.ts server/services/voteConfirmation.ts
```

Editer `server/types.ts` : **supprimer** le bloc `AppVariables`/`AppEnv` (spécifique Hono) et l'import Hono s'il existe ; **garder** `Db`, `Sebpay*`, `PaymentConfig`. Résultat final :
```ts
import type { Sql } from 'postgres'

export type Db = Sql

export interface SebpayCollection {
  transaction_id: string
  status: string
  external_reference?: string
  amount?: number
  currency?: string
  provider_link?: string | null
  message?: string
}

export interface SebpayCollectionInput {
  amount: number
  currency: string
  phone: string
  operator: string
  country?: string
  externalReference: string
  callbackUrl: string
}

export interface SebpayCountry {
  country_code: string
  country_name?: string
  prefix?: string
  currency?: { code: string; name?: string; symbol?: string }
  [key: string]: unknown
}

export interface SebpayOperator {
  slug: string
  name?: string
  code?: string
  otp_required?: boolean
  [key: string]: unknown
}

export interface SebpayClient {
  createCollection(input: SebpayCollectionInput): Promise<SebpayCollection>
  getCollection(reference: string): Promise<SebpayCollection>
  getCountries(): Promise<SebpayCountry[]>
  getOperators(country?: string): Promise<SebpayOperator[]>
}

export interface PaymentConfig {
  callbackUrl: string
}
```

Create `server/lib/db.ts` (adapté de `api/src/db.ts`, import relatif `.ts` non nécessaire en Nitro — auto-import des utils, mais on garde un import explicite depuis `../types`) :
```ts
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
```

Editer `server/lib/sebpay.ts` : changer l'import `from '../types'` (déjà relatif, OK) ; retirer toute extension `.ts` d'import si présente (Nitro/tsc résout sans). Vérifier qu'il n'importe rien de Hono (il n'en importe pas).

Editer `server/services/voteConfirmation.ts` : import `from '../types'` (OK).

- [ ] **Step 3: Config vitest à la racine**

Create `vitest.config.ts` :
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/server/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Porter les tests sebpay + voteConfirmation (changement d'import uniquement)**

Copier et ré-pointer :
```bash
mkdir -p test/server
cp api/test/sebpay.test.ts test/server/sebpay.test.ts
cp api/test/voteConfirmation.test.ts test/server/voteConfirmation.test.ts
```

Dans `test/server/sebpay.test.ts` : remplacer l'import
`from '../src/lib/sebpay.ts'` → `from '../../server/lib/sebpay'`
et retirer l'import `readJson` de helpers s'il existe (sebpay n'en a pas). Retirer aussi la ligne d'import helpers si présente.

Dans `test/server/voteConfirmation.test.ts` : remplacer
`from '../src/services/voteConfirmation.ts'` → `from '../../server/services/voteConfirmation'`
et `from '../src/types'` → `from '../../server/types'`.

- [ ] **Step 5: Lancer les tests portés**

Run:
```bash
npx vitest run test/server/sebpay.test.ts test/server/voteConfirmation.test.ts
```
Expected: PASS — 14 tests (9 sebpay + 5 voteConfirmation).

- [ ] **Step 6: Commit**

```bash
git add server/ test/server/ vitest.config.ts package.json package-lock.json
git commit -m "feat(server): porte db/sebpay/voteConfirmation en server/ avec leurs tests"
```

---

### Task 5: Contrat HTTP des services (errors + HttpResult)

**Files:**
- Create: `server/lib/errors.ts`
- Create: `test/server/errors.test.ts`

**Interfaces:**
- Produces:
  - `interface ErrorEntry { status: number; code: string; message: string }`
  - `const ERRORS` (mêmes entrées que l'API actuelle)
  - `interface HttpResult { status: number; body: unknown }`
  - `function ok(body: unknown, status?: number): HttpResult`
  - `function fail(entry: ErrorEntry, message?: string): HttpResult`

- [ ] **Step 1: Écrire le test (RED)**

Create `test/server/errors.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { ok, fail, ERRORS } from '../../server/lib/errors'

describe('HttpResult helpers', () => {
  it('ok() enveloppe le corps avec 200 par défaut', () => {
    expect(ok({ a: 1 })).toEqual({ status: 200, body: { a: 1 } })
  })

  it('ok() accepte un statut explicite', () => {
    expect(ok({ id: 'x' }, 201)).toEqual({ status: 201, body: { id: 'x' } })
  })

  it('fail() construit le corps erreur depuis une entrée ERRORS', () => {
    expect(fail(ERRORS.NOT_FOUND)).toEqual({
      status: 404,
      body: { error: { code: 'not_found', message: 'Ressource introuvable' } },
    })
  })

  it('fail() autorise un message override', () => {
    expect(fail(ERRORS.VALIDATION, 'Champ X invalide')).toEqual({
      status: 400,
      body: { error: { code: 'validation_error', message: 'Champ X invalide' } },
    })
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run test/server/errors.test.ts`
Expected: FAIL — module `server/lib/errors` introuvable.

- [ ] **Step 3: Implémenter (GREEN)**

Create `server/lib/errors.ts` :
```ts
export interface ErrorEntry {
  status: number
  code: string
  message: string
}

export const ERRORS = Object.freeze({
  UNAUTHORIZED: { status: 401, code: 'unauthorized', message: 'Authentification requise' },
  INVALID_CREDENTIALS: { status: 401, code: 'invalid_credentials', message: 'Email ou mot de passe incorrect' },
  FORBIDDEN: { status: 403, code: 'forbidden', message: 'Accès refusé' },
  NOT_FOUND: { status: 404, code: 'not_found', message: 'Ressource introuvable' },
  VALIDATION: { status: 400, code: 'validation_error', message: 'Données invalides' },
  CONFLICT: { status: 409, code: 'conflict', message: 'Conflit' },
  LOCKED: { status: 409, code: 'locked', message: 'Ressource verrouillée' },
}) satisfies Record<string, ErrorEntry>

export interface HttpResult {
  status: number
  body: unknown
}

export function ok(body: unknown, status = 200): HttpResult {
  return { status, body }
}

export function fail(entry: ErrorEntry, message?: string): HttpResult {
  return { status: entry.status, body: { error: { code: entry.code, message: message ?? entry.message } } }
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run test/server/errors.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add server/lib/errors.ts test/server/errors.test.ts
git commit -m "feat(server): contrat HttpResult (ok/fail) + entrées ERRORS"
```

---

### Task 6: Fakes de test partagés

**Files:**
- Create: `test/server/helpers.ts`

**Interfaces:**
- Produces:
  - `recordingDb(result?): RecordingDb` — fake db taggée avec `.calls` et `.begin`
  - `interface RecordingDb` (callable + `calls: { sql; params }[]` + `begin`)

- [ ] **Step 1: Porter les fakes (sans buildTestApp, plus besoin de Hono)**

Create `test/server/helpers.ts` :
```ts
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
    return Promise.resolve(typeof result === 'function' ? result(strings.join('?'), params) : result)
  }) as RecordingDb
  db.calls = calls
  db.begin = (fn) => fn(db)
  return db
}

export const asDb = (db: unknown): Db => db as unknown as Db
```

- [ ] **Step 2: Vérifier la compilation via un test bidon**

Run:
```bash
npx tsc --noEmit -p tsconfig.json 2>/dev/null; echo "helpers créés"
```
(La vérif type complète intervient Task 12 ; ici on s'assure juste que le fichier existe.)

- [ ] **Step 3: Commit**

```bash
git add test/server/helpers.ts
git commit -m "test(server): fakes db partagés pour les tests de services"
```

---

### Task 7: Service + handlers candidates

**Files:**
- Create: `server/services/candidates.ts`, `server/api/candidates/index.get.ts`, `server/api/candidates/[id].get.ts`
- Create: `test/server/candidates.test.ts`

**Interfaces:**
- Consumes: `Db` (types), `ok`/`fail`/`ERRORS` (errors), `recordingDb`/`asDb` (helpers).
- Produces:
  - `isUuid(value: unknown): value is string`
  - `listCandidates(db: Db): Promise<HttpResult>`
  - `getCandidateWithPhotos(db: Db, id: string): Promise<HttpResult>`

- [ ] **Step 1: Écrire le test (RED)**

Create `test/server/candidates.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { recordingDb, asDb } from './helpers'
import { isUuid, listCandidates, getCandidateWithPhotos } from '../../server/services/candidates'

const CANDIDATE_ID = '6a3c0e1f-2b4d-4f5a-9c8e-1d2f3a4b5c6d'

describe('isUuid', () => {
  it('valide un uuid, rejette le reste', () => {
    expect(isUuid(CANDIDATE_ID)).toBe(true)
    expect(isUuid('pas-uuid')).toBe(false)
    expect(isUuid(42)).toBe(false)
  })
})

describe('listCandidates', () => {
  it('renvoie la liste triée par votes (200)', async () => {
    const db = recordingDb([
      { id: 'c1', full_name: 'Awa B', atelier: 'X', commune: 'Lokossa', profile_photo_url: null, vote_count: 12 },
    ])
    const res = await listCandidates(asDb(db))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(db.calls[0]!.sql).toContain('ORDER BY vote_count DESC')
  })
})

describe('getCandidateWithPhotos', () => {
  it('renvoie candidat + photos (200)', async () => {
    const db = recordingDb((sql) =>
      sql.includes('FROM candidate_photos')
        ? [{ id: 'p1', photo_url: 'https://img/1.jpg', caption: null, photo_order: 1 }]
        : [{ id: CANDIDATE_ID, full_name: 'Awa B', atelier: null, commune: null, profile_photo_url: null, vote_count: 0 }],
    )
    const res = await getCandidateWithPhotos(asDb(db), CANDIDATE_ID)
    expect(res.status).toBe(200)
    expect((res.body as { photos: unknown[] }).photos).toHaveLength(1)
  })

  it('renvoie 404 si id non-uuid, sans requête DB', async () => {
    const db = recordingDb([])
    const res = await getCandidateWithPhotos(asDb(db), 'inconnu')
    expect(res.status).toBe(404)
    expect(db.calls).toHaveLength(0)
  })

  it('renvoie 404 si candidat absent', async () => {
    const db = recordingDb([])
    const res = await getCandidateWithPhotos(asDb(db), CANDIDATE_ID)
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run test/server/candidates.test.ts`
Expected: FAIL — module `server/services/candidates` introuvable.

- [ ] **Step 3: Implémenter le service (GREEN)**

Create `server/services/candidates.ts` :
```ts
import type { Db } from '../types'
import { ok, fail, ERRORS, type HttpResult } from '../lib/errors'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export async function listCandidates(db: Db): Promise<HttpResult> {
  const rows = await db`
    SELECT id, full_name, atelier, commune, profile_photo_url, vote_count
    FROM candidates
    ORDER BY vote_count DESC, created_at ASC`
  return ok(rows)
}

export async function getCandidateWithPhotos(db: Db, id: string): Promise<HttpResult> {
  if (!isUuid(id)) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')
  const rows = await db`
    SELECT id, full_name, atelier, commune, profile_photo_url, vote_count
    FROM candidates
    WHERE id = ${id}`
  const candidate = rows[0]
  if (!candidate) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')
  const photos = await db`
    SELECT id, photo_url, caption, photo_order
    FROM candidate_photos
    WHERE candidate_id = ${id}
    ORDER BY photo_order ASC`
  return ok({ ...candidate, photos })
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run test/server/candidates.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Écrire les handlers H3 minces**

Create `server/api/candidates/index.get.ts` :
```ts
import { getDb } from '../../lib/db'
import { listCandidates } from '../../services/candidates'

export default defineEventHandler(async (event) => {
  const result = await listCandidates(getDb())
  setResponseStatus(event, result.status)
  return result.body
})
```

Create `server/api/candidates/[id].get.ts` :
```ts
import { getDb } from '../../lib/db'
import { getCandidateWithPhotos } from '../../services/candidates'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const result = await getCandidateWithPhotos(getDb(), id)
  setResponseStatus(event, result.status)
  return result.body
})
```

- [ ] **Step 6: Commit**

```bash
git add server/services/candidates.ts server/api/candidates/ test/server/candidates.test.ts
git commit -m "feat(server): route candidates (service testé + handlers Nitro)"
```

---

### Task 8: Service + handler settings

**Files:**
- Create: `server/services/settings.ts`, `server/api/settings/public.get.ts`
- Create: `test/server/settings.test.ts`

**Interfaces:**
- Consumes: `Db`, `ok`, `recordingDb`/`asDb`.
- Produces: `getPublicSettings(db: Db): Promise<HttpResult>`

- [ ] **Step 1: Écrire le test (RED)**

Create `test/server/settings.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { recordingDb, asDb } from './helpers'
import { getPublicSettings } from '../../server/services/settings'

describe('getPublicSettings', () => {
  it('expose uniquement prix et devise (200)', async () => {
    const db = recordingDb([{ vote_unit_price: 100, currency: 'XOF' }])
    const res = await getPublicSettings(asDb(db))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ vote_unit_price: 100, currency: 'XOF' })
  })

  it('renvoie null/null si aucun réglage', async () => {
    const db = recordingDb([])
    const res = await getPublicSettings(asDb(db))
    expect(res.body).toEqual({ vote_unit_price: null, currency: null })
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run test/server/settings.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter (GREEN)**

Create `server/services/settings.ts` :
```ts
import type { Db } from '../types'
import { ok, type HttpResult } from '../lib/errors'

export async function getPublicSettings(db: Db): Promise<HttpResult> {
  const rows = await db`SELECT vote_unit_price, currency FROM settings WHERE id = 1`
  const row = rows[0] ?? { vote_unit_price: null, currency: null }
  return ok({ vote_unit_price: row.vote_unit_price, currency: row.currency })
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run test/server/settings.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 5: Handler H3**

Create `server/api/settings/public.get.ts` :
```ts
import { getDb } from '../../lib/db'
import { getPublicSettings } from '../../services/settings'

export default defineEventHandler(async (event) => {
  const result = await getPublicSettings(getDb())
  setResponseStatus(event, result.status)
  return result.body
})
```

- [ ] **Step 6: Commit**

```bash
git add server/services/settings.ts server/api/settings/ test/server/settings.test.ts
git commit -m "feat(server): route settings/public (service testé + handler)"
```

---

### Task 9: Contexte SebPay/paiement (server/utils)

**Files:**
- Create: `server/utils/context.ts`

**Interfaces:**
- Produces:
  - `getSebpay(): SebpayClient | null` — instancié depuis l'env (via `createSebpayFromEnv`)
  - `getSebpaySecret(): string`
  - `getPaymentConfig(): PaymentConfig`

- [ ] **Step 1: Implémenter les helpers de contexte**

Create `server/utils/context.ts` :
```ts
import { createSebpayFromEnv } from '../lib/sebpay'
import type { SebpayClient, PaymentConfig } from '../types'

let sebpayInstance: SebpayClient | null | undefined

export function getSebpay(): SebpayClient | null {
  if (sebpayInstance === undefined) sebpayInstance = createSebpayFromEnv()
  return sebpayInstance
}

export function getSebpaySecret(): string {
  return process.env.SEBPAY_SECRET_KEY ?? ''
}

export function getPaymentConfig(): PaymentConfig {
  return { callbackUrl: process.env.SEBPAY_CALLBACK_URL ?? '' }
}
```
Note: `server/utils/` est auto-importé par Nitro, mais on garde des imports explicites dans les handlers pour la clarté et la testabilité.

- [ ] **Step 2: Vérifier que ça compile (import isolé)**

Run:
```bash
node -e "require('fs').accessSync('server/utils/context.ts'); console.log('context.ts OK')"
```
Expected: `context.ts OK` (vérif type complète en Task 12).

- [ ] **Step 3: Commit**

```bash
git add server/utils/context.ts
git commit -m "feat(server): helpers de contexte SebPay/paiement (env → deps)"
```

---

### Task 10: Service + handlers payment (pays/opérateurs avec cache)

**Files:**
- Create: `server/services/payment.ts`, `server/api/payment/countries.get.ts`, `server/api/payment/operators.get.ts`
- Create: `test/server/payment.test.ts`

**Interfaces:**
- Consumes: `SebpayClient` (types), `ok` (errors).
- Produces:
  - `getCountriesList(sebpay: SebpayClient | null): Promise<HttpResult>`
  - `getOperatorsList(sebpay: SebpayClient | null, country: string): Promise<HttpResult>`
  - `FALLBACK_COUNTRIES`, `FALLBACK_OPERATORS` (exportés pour test)

- [ ] **Step 1: Écrire le test (RED)**

Create `test/server/payment.test.ts` :
```ts
import { describe, it, expect, vi } from 'vitest'
import { getCountriesList, getOperatorsList, FALLBACK_COUNTRIES } from '../../server/services/payment'
import type { SebpayClient } from '../../server/types'

const asSebpay = (o: unknown): SebpayClient => o as unknown as SebpayClient

describe('getCountriesList', () => {
  it('renvoie le fallback si SebPay non configuré', async () => {
    const res = await getCountriesList(null)
    expect(res.status).toBe(200)
    expect((res.body as { countries: unknown[] }).countries).toEqual(FALLBACK_COUNTRIES)
  })

  it('renvoie les pays SebPay quand dispo', async () => {
    const getCountries = vi.fn().mockResolvedValue([{ country_code: 'BJ', prefix: '+229' }])
    const res = await getCountriesList(asSebpay({ getCountries }))
    expect((res.body as { countries: { country_code: string }[] }).countries[0]!.country_code).toBe('BJ')
  })

  it('retombe sur le fallback si SebPay lève', async () => {
    const getCountries = vi.fn().mockRejectedValue(new Error('boom'))
    const res = await getCountriesList(asSebpay({ getCountries }))
    expect((res.body as { countries: unknown[] }).countries).toEqual(FALLBACK_COUNTRIES)
  })
})

describe('getOperatorsList', () => {
  it('interroge SebPay filtré par pays', async () => {
    const getOperators = vi.fn().mockResolvedValue([{ slug: 'mtn' }])
    const res = await getOperatorsList(asSebpay({ getOperators }), 'BJ')
    expect((res.body as { operators: { slug: string }[] }).operators[0]!.slug).toBe('mtn')
    expect(getOperators).toHaveBeenCalledWith('BJ')
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run test/server/payment.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter (GREEN)**

Create `server/services/payment.ts` (reprend le contenu de `api/src/routes/payment.ts`, sans Hono) :
```ts
import type { SebpayClient } from '../types'
import { ok, type HttpResult } from '../lib/errors'

// Zone UEMOA : toutes ces devises sont le Franc CFA (XOF), prix de vote identique.
const XOF = { code: 'XOF', name: 'Franc CFA (UEMOA)' }
export const FALLBACK_COUNTRIES = [
  { country_code: 'BJ', country_name: 'Bénin', prefix: '+229', currency: XOF },
  { country_code: 'TG', country_name: 'Togo', prefix: '+228', currency: XOF },
  { country_code: 'CI', country_name: "Côte d'Ivoire", prefix: '+225', currency: XOF },
  { country_code: 'SN', country_name: 'Sénégal', prefix: '+221', currency: XOF },
  { country_code: 'BF', country_name: 'Burkina Faso', prefix: '+226', currency: XOF },
  { country_code: 'ML', country_name: 'Mali', prefix: '+223', currency: XOF },
  { country_code: 'NE', country_name: 'Niger', prefix: '+227', currency: XOF },
  { country_code: 'GW', country_name: 'Guinée-Bissau', prefix: '+245', currency: XOF },
]
export const FALLBACK_OPERATORS = [{ slug: 'demo', name: 'Démo (simulation)', otp_required: false }]

const CACHE_TTL_MS = 60 * 60 * 1000
interface CacheEntry {
  value: unknown
  at: number
}
const cache = new Map<string, CacheEntry>()

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry.value as T
  const value = await loader()
  cache.set(key, { value, at: Date.now() })
  return value
}

export async function getCountriesList(sebpay: SebpayClient | null): Promise<HttpResult> {
  if (!sebpay) return ok({ countries: FALLBACK_COUNTRIES })
  try {
    const countries = await cached('countries', () => sebpay.getCountries())
    return ok({ countries })
  } catch {
    return ok({ countries: FALLBACK_COUNTRIES })
  }
}

export async function getOperatorsList(sebpay: SebpayClient | null, country: string): Promise<HttpResult> {
  if (!sebpay) return ok({ operators: FALLBACK_OPERATORS })
  try {
    const operators = await cached(`operators:${country}`, () => sebpay.getOperators(country))
    return ok({ operators })
  } catch {
    return ok({ operators: FALLBACK_OPERATORS })
  }
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run test/server/payment.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Handlers H3**

Create `server/api/payment/countries.get.ts` :
```ts
import { getSebpay } from '../../utils/context'
import { getCountriesList } from '../../services/payment'

export default defineEventHandler(async (event) => {
  const result = await getCountriesList(getSebpay())
  setResponseStatus(event, result.status)
  return result.body
})
```

Create `server/api/payment/operators.get.ts` :
```ts
import { getSebpay } from '../../utils/context'
import { getOperatorsList } from '../../services/payment'

export default defineEventHandler(async (event) => {
  const country = getQuery(event).country
  const value = typeof country === 'string' && country ? country : 'BJ'
  const result = await getOperatorsList(getSebpay(), value)
  setResponseStatus(event, result.status)
  return result.body
})
```

- [ ] **Step 6: Commit**

```bash
git add server/services/payment.ts server/api/payment/ test/server/payment.test.ts
git commit -m "feat(server): routes payment countries/operators (service testé + handlers)"
```

---

### Task 11: Service + handlers votes (submit / status / webhook)

**Files:**
- Create: `server/services/votes.ts`, `server/api/votes/index.post.ts`, `server/api/votes/[id]/status.get.ts`, `server/api/votes/webhook.post.ts`
- Create: `test/server/votes.test.ts`

**Interfaces:**
- Consumes: `Db`, `SebpayClient`, `PaymentConfig` (types) ; `ok`/`fail`/`ERRORS` ; `confirmVote`/`rejectVote` (voteConfirmation) ; `verifyWebhookSignature` (sebpay) ; `isUuid` (candidates).
- Produces:
  - `submitVote(deps: VoteDeps, body: unknown): Promise<HttpResult>`
  - `getVoteStatus(deps: VoteStatusDeps, id: string): Promise<HttpResult>`
  - `processWebhook(deps: WebhookDeps, rawBody: string, signature: string | null): Promise<HttpResult>`
  - `interface VoteDeps { db: Db; sebpay: SebpayClient | null; config: PaymentConfig }`
  - `interface VoteStatusDeps { db: Db; sebpay: SebpayClient | null }`
  - `interface WebhookDeps { db: Db; secret: string }`

- [ ] **Step 1: Écrire le test (RED)**

Create `test/server/votes.test.ts` (porté de `api/test/votes.routes.test.ts`, adapté aux services) :
```ts
import { describe, it, expect, vi } from 'vitest'
import crypto from 'node:crypto'
import { submitVote, getVoteStatus, processWebhook } from '../../server/services/votes'
import { asDb } from './helpers'
import type { Db, SebpayClient } from '../../server/types'

const CANDIDATE_ID = '6a3c0e1f-2b4d-4f5a-9c8e-1d2f3a4b5c6d'
const VOTE_ID = '11111111-2222-3333-4444-555555555555'
const SECRET = 'sk_test_xyz'

const asSebpay = (o: unknown): SebpayClient => o as unknown as SebpayClient

interface VoteRow {
  id: string
  receipt_code: string | null
  candidate_id: string
  quantity: number
  payment_status: string
  votes_before: number
  votes_after: number
}
interface DbState {
  voteCount: number
  vote: VoteRow
  calls: string[]
}

function makeDb({ candidateExists = true, voteCount = 10, voteStatus = 'pending' } = {}) {
  const state: DbState = {
    voteCount,
    vote: {
      id: VOTE_ID, receipt_code: null, candidate_id: CANDIDATE_ID, quantity: 3,
      payment_status: voteStatus, votes_before: voteCount, votes_after: voteCount,
    },
    calls: [],
  }
  const run = (strings: TemplateStringsArray, params: unknown[]): unknown[] => {
    const sql = strings.join('?')
    state.calls.push(sql)
    if (sql.includes('FROM candidates') && sql.includes('FOR UPDATE')) return [{ vote_count: state.voteCount }]
    if (sql.includes('FROM candidates')) return candidateExists ? [{ id: CANDIDATE_ID, vote_count: state.voteCount }] : []
    if (sql.includes('FROM settings')) return [{ vote_unit_price: 100, currency: 'XOF' }]
    if (sql.includes('INSERT INTO votes')) {
      state.vote.receipt_code = (params.find((p) => typeof p === 'string' && p.startsWith('AWAC-')) as string) ?? null
      return [{ id: VOTE_ID, receipt_code: state.vote.receipt_code }]
    }
    if (sql.includes('FROM votes') && sql.includes('FOR UPDATE')) return [{ ...state.vote }]
    if (sql.includes('SELECT') && sql.includes('FROM votes')) {
      return [{ id: VOTE_ID, receipt_code: state.vote.receipt_code ?? 'AWAC-known', payment_status: state.vote.payment_status, votes_after: state.vote.votes_after }]
    }
    if (sql.includes('UPDATE candidates')) { state.voteCount = params[0] as number; state.vote.votes_after = params[0] as number; return [] }
    if (sql.includes('UPDATE votes')) {
      const terminal = params.find((p) => p === 'confirmed' || p === 'rejected')
      if (terminal) state.vote.payment_status = terminal as string
      return [{ ...state.vote }]
    }
    return []
  }
  const db = ((strings: TemplateStringsArray, ...params: unknown[]) => Promise.resolve(run(strings, params))) as {
    (strings: TemplateStringsArray, ...params: unknown[]): Promise<unknown[]>
    begin: (fn: (tx: (s: TemplateStringsArray, ...p: unknown[]) => Promise<unknown[]>) => unknown) => Promise<unknown>
    _state: DbState
  }
  db.begin = async (fn) => fn((strings: TemplateStringsArray, ...params: unknown[]) => Promise.resolve(run(strings, params)))
  db._state = state
  return db
}

const validBody = { candidate_id: CANDIDATE_ID, quantity: 3, operator: 'mtn', voter_phone: '+22997000000', country: 'BJ' }
const config = { callbackUrl: 'https://awac.test/votes/webhook' }

describe('submitVote — mode simulé', () => {
  it('crée un vote et le confirme immédiatement (201)', async () => {
    const db = makeDb()
    const res = await submitVote({ db: asDb(db) as unknown as Db, sebpay: null, config }, { ...validBody, operator: 'demo' })
    expect(res.status).toBe(201)
    expect((res.body as { payment_status: string }).payment_status).toBe('confirmed')
    expect((res.body as { receipt_code: string }).receipt_code).toMatch(/^AWAC-/)
    expect(db._state.voteCount).toBe(13)
  })
})

describe('submitVote — mode réel', () => {
  it('crée un vote pending, appelle SebPay, renvoie provider_link (201)', async () => {
    const db = makeDb()
    const createCollection = vi.fn().mockResolvedValue({ transaction_id: 'sp_1', status: 'pending', provider_link: 'https://pay/x' })
    const res = await submitVote({ db: asDb(db) as unknown as Db, sebpay: asSebpay({ createCollection }), config }, validBody)
    expect(res.status).toBe(201)
    expect((res.body as { provider_link: string }).provider_link).toBe('https://pay/x')
    expect(db._state.voteCount).toBe(10)
    const [args] = createCollection.mock.calls[0]!
    expect(args.phone).toBe('22997000000')
    expect(args.amount).toBe(300)
  })

  it('renvoie 502 si SebPay refuse', async () => {
    const db = makeDb()
    const createCollection = vi.fn().mockRejectedValue(new Error('Numéro invalide'))
    const res = await submitVote({ db: asDb(db) as unknown as Db, sebpay: asSebpay({ createCollection }), config }, validBody)
    expect(res.status).toBe(502)
  })

  it('rejette les entrées invalides avant tout appel SebPay (400)', async () => {
    const createCollection = vi.fn()
    for (const body of [
      { ...validBody, quantity: 0 },
      { ...validBody, candidate_id: 'pas-uuid' },
      { ...validBody, operator: '' },
      { ...validBody, voter_phone: '' },
    ]) {
      const res = await submitVote({ db: asDb(makeDb()) as unknown as Db, sebpay: asSebpay({ createCollection }), config }, body)
      expect(res.status).toBe(400)
    }
    expect(createCollection).not.toHaveBeenCalled()
  })
})

describe('getVoteStatus — polling', () => {
  it('réconcilie via SebPay et confirme quand approved', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getCollection = vi.fn().mockResolvedValue({ transaction_id: 'sp_1', status: 'approved' })
    const res = await getVoteStatus({ db: asDb(db) as unknown as Db, sebpay: asSebpay({ getCollection }) }, VOTE_ID)
    expect(res.status).toBe(200)
    expect((res.body as { payment_status: string }).payment_status).toBe('confirmed')
    expect(getCollection).toHaveBeenCalledWith('AWAC-known')
  })

  it('ne rappelle pas SebPay si déjà confirmé', async () => {
    const db = makeDb({ voteStatus: 'confirmed' })
    const getCollection = vi.fn()
    const res = await getVoteStatus({ db: asDb(db) as unknown as Db, sebpay: asSebpay({ getCollection }) }, VOTE_ID)
    expect((res.body as { payment_status: string }).payment_status).toBe('confirmed')
    expect(getCollection).not.toHaveBeenCalled()
  })

  it('reste pending si SebPay injoignable', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const getCollection = vi.fn().mockRejectedValue(new Error('timeout'))
    const res = await getVoteStatus({ db: asDb(db) as unknown as Db, sebpay: asSebpay({ getCollection }) }, VOTE_ID)
    expect((res.body as { payment_status: string }).payment_status).toBe('pending')
  })

  it('renvoie 404 si id non-uuid', async () => {
    const db = makeDb()
    const res = await getVoteStatus({ db: asDb(db) as unknown as Db, sebpay: null }, 'inconnu')
    expect(res.status).toBe(404)
  })
})

describe('processWebhook — signature', () => {
  const sign = (raw: string) => crypto.createHmac('sha256', SECRET).update(raw).digest('hex')

  it('confirme le vote sur webhook approved signé (200)', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const raw = JSON.stringify({ external_reference: 'AWAC-known', transaction_id: 'sp_1', status: 'approved' })
    const res = await processWebhook({ db: asDb(db) as unknown as Db, secret: SECRET }, raw, sign(raw))
    expect(res.status).toBe(200)
    expect(db._state.voteCount).toBe(13)
  })

  it('rejette une signature invalide (401), sans muter', async () => {
    const db = makeDb({ voteStatus: 'pending' })
    const raw = JSON.stringify({ external_reference: 'AWAC-known', status: 'approved' })
    const res = await processWebhook({ db: asDb(db) as unknown as Db, secret: SECRET }, raw, 'faux')
    expect(res.status).toBe(401)
    expect(db._state.voteCount).toBe(10)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run test/server/votes.test.ts`
Expected: FAIL — module `server/services/votes` introuvable.

- [ ] **Step 3: Implémenter le service (GREEN)**

Create `server/services/votes.ts` (logique portée de `api/src/routes/votes.ts`, HTTP retiré) :
```ts
import type { Db, SebpayClient, PaymentConfig } from '../types'
import { ok, fail, ERRORS, type HttpResult, type ErrorEntry } from '../lib/errors'
import { isUuid } from './candidates'
import { verifyWebhookSignature } from '../lib/sebpay'
import { confirmVote, rejectVote } from './voteConfirmation'

const MAX_QUANTITY_PER_VOTE = 1000000
const DEFAULT_COUNTRY = 'BJ'
const PAYMENT_ERROR: ErrorEntry = { status: 502, code: 'payment_error', message: 'Le paiement a échoué' }

export interface VoteDeps {
  db: Db
  sebpay: SebpayClient | null
  config: PaymentConfig
}
export interface VoteStatusDeps {
  db: Db
  sebpay: SebpayClient | null
}
export interface WebhookDeps {
  db: Db
  secret: string
}

function generateReceiptCode(): string {
  return `AWAC-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

// SebPay attend un numéro international sans le « + ».
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

export async function submitVote(deps: VoteDeps, body: unknown): Promise<HttpResult> {
  const input = (body ?? {}) as Record<string, unknown>
  const candidateId = input.candidate_id
  const quantity = input.quantity
  const operator = typeof input.operator === 'string' ? input.operator.trim() : ''
  const voterPhone = typeof input.voter_phone === 'string' ? input.voter_phone.trim() : ''
  const country = typeof input.country === 'string' && input.country ? input.country : DEFAULT_COUNTRY

  if (!isUuid(candidateId)) return fail(ERRORS.VALIDATION, 'candidate_id invalide')
  if (!Number.isInteger(quantity) || (quantity as number) <= 0) {
    return fail(ERRORS.VALIDATION, 'La quantité doit être un entier positif')
  }
  if ((quantity as number) > MAX_QUANTITY_PER_VOTE) {
    return fail(ERRORS.VALIDATION, `Quantité maximale par transaction : ${MAX_QUANTITY_PER_VOTE}`)
  }
  if (!operator) return fail(ERRORS.VALIDATION, 'Opérateur requis')
  if (!voterPhone) return fail(ERRORS.VALIDATION, 'Numéro de téléphone requis')

  const { db, sebpay, config } = deps
  const quantityNum = quantity as number

  const candidateRows = await db`SELECT id, vote_count FROM candidates WHERE id = ${candidateId}`
  const candidate = candidateRows[0]
  if (!candidate) return fail(ERRORS.NOT_FOUND, 'Candidat introuvable')
  const voteCount = candidate.vote_count

  const settingsRows = await db`SELECT vote_unit_price, currency FROM settings WHERE id = 1`
  const settings = settingsRows[0]
  if (!settings) return fail(ERRORS.NOT_FOUND, 'Réglages introuvables')
  const { vote_unit_price: unitPrice, currency: defaultCurrency } = settings
  const requestedCurrency = typeof input.currency === 'string' ? input.currency.trim().toUpperCase() : ''
  const currency = /^[A-Z]{3}$/.test(requestedCurrency) ? requestedCurrency : defaultCurrency
  const totalAmount = Number(unitPrice) * quantityNum
  const receiptCode = generateReceiptCode()

  let transactionId: string | null = null
  let providerLink: string | null = null
  const simulated = !sebpay

  if (sebpay) {
    try {
      const collection = await sebpay.createCollection({
        amount: totalAmount,
        currency,
        phone: normalizePhone(voterPhone),
        operator,
        country,
        externalReference: receiptCode,
        callbackUrl: config.callbackUrl,
      })
      transactionId = collection.transaction_id ?? null
      providerLink = collection.provider_link ?? null
    } catch (err) {
      return fail(PAYMENT_ERROR, err instanceof Error ? err.message : undefined)
    }
  }

  const inserted = await db`
    INSERT INTO votes (candidate_id, quantity, unit_price, total_amount, currency,
                       voter_phone, receipt_code, votes_before, votes_after,
                       payment_provider, payment_status, payment_reference)
    VALUES (${candidateId}, ${quantityNum}, ${unitPrice}, ${totalAmount}, ${currency},
            ${voterPhone}, ${receiptCode}, ${voteCount}, ${voteCount},
            ${operator}, 'pending', ${transactionId})
    RETURNING id, receipt_code`

  let paymentStatus = 'pending'
  if (simulated) {
    await confirmVote(db, receiptCode, null)
    paymentStatus = 'confirmed'
  }

  return ok({
    id: inserted[0]?.id,
    receipt_code: receiptCode,
    payment_status: paymentStatus,
    provider_link: providerLink,
    amount: totalAmount,
    currency,
  }, 201)
}

export async function getVoteStatus(deps: VoteStatusDeps, id: string): Promise<HttpResult> {
  if (!isUuid(id)) return fail(ERRORS.NOT_FOUND, 'Vote introuvable')
  const { db, sebpay } = deps
  const rows = await db`SELECT id, receipt_code, payment_status, votes_after FROM votes WHERE id = ${id}`
  const vote = rows[0]
  if (!vote) return fail(ERRORS.NOT_FOUND, 'Vote introuvable')

  let { payment_status: paymentStatus, votes_after: votesAfter } = vote

  if (paymentStatus === 'pending' && sebpay) {
    try {
      const collection = await sebpay.getCollection(vote.receipt_code)
      if (collection.status === 'approved') {
        const result = await confirmVote(db, vote.receipt_code, collection.transaction_id)
        paymentStatus = result.status === 'not_found' ? paymentStatus : 'confirmed'
        votesAfter = result.votesAfter ?? votesAfter
      } else if (collection.status === 'rejected') {
        await rejectVote(db, vote.receipt_code)
        paymentStatus = 'rejected'
      }
    } catch {
      // Erreur transitoire SebPay : on garde pending, le prochain sondage réessaiera.
    }
  }

  return ok({ id, payment_status: paymentStatus, votes_after: votesAfter })
}

export async function processWebhook(deps: WebhookDeps, rawBody: string, signature: string | null): Promise<HttpResult> {
  const { db, secret } = deps
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return fail(ERRORS.UNAUTHORIZED, 'Signature invalide')
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return fail(ERRORS.VALIDATION, 'Corps invalide')
  }

  const reference = payload.external_reference
  if (typeof reference === 'string' && reference) {
    if (payload.status === 'approved') await confirmVote(db, reference, (payload.transaction_id as string) ?? null)
    else if (payload.status === 'rejected') await rejectVote(db, reference)
  }

  return ok({ received: true })
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run test/server/votes.test.ts`
Expected: PASS — 11 tests.

- [ ] **Step 5: Handlers H3**

Create `server/api/votes/index.post.ts` :
```ts
import { getDb } from '../../lib/db'
import { getSebpay, getPaymentConfig } from '../../utils/context'
import { submitVote } from '../../services/votes'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const result = await submitVote({ db: getDb(), sebpay: getSebpay(), config: getPaymentConfig() }, body)
  setResponseStatus(event, result.status)
  return result.body
})
```

Create `server/api/votes/[id]/status.get.ts` :
```ts
import { getDb } from '../../../lib/db'
import { getSebpay } from '../../../utils/context'
import { getVoteStatus } from '../../../services/votes'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const result = await getVoteStatus({ db: getDb(), sebpay: getSebpay() }, id)
  setResponseStatus(event, result.status)
  return result.body
})
```

Create `server/api/votes/webhook.post.ts` :
```ts
import { getDb } from '../../lib/db'
import { getSebpaySecret } from '../../utils/context'
import { processWebhook } from '../../services/votes'

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event) ?? ''
  const signature = getHeader(event, 'x-sebpay-signature') ?? null
  const result = await processWebhook({ db: getDb(), secret: getSebpaySecret() }, rawBody, signature)
  setResponseStatus(event, result.status)
  return result.body
})
```

- [ ] **Step 6: Commit**

```bash
git add server/services/votes.ts server/api/votes/ test/server/votes.test.ts
git commit -m "feat(server): routes votes submit/status/webhook (service testé + handlers)"
```

---

### Task 12: Retirer l'API Hono, vérif globale, démarrage réel

**Files:**
- Delete: `api/` (dossier entier)
- Modify: `package.json` (retirer `hono`, `@hono/node-server` si présents à la racine)

**Interfaces:**
- Consumes: tout Phase 1.
- Produces: repo sans serveur Hono ; `/api/*` servi par Nitro ; tests + typecheck verts.

- [ ] **Step 1: Vérifier que toute la suite de tests passe**

Run:
```bash
npx vitest run
```
Expected: PASS — **40 tests** (errors 4 + sebpay 9 + voteConfirmation 5 + candidates 5 + settings 2 + payment 4 + votes 11 = 40 ; critère : aucun échec).

_Note: le total de tests augmente vs. l'ancien (14 route-tests → 22 service-tests) car les services sont testés plus finement. C'est attendu. Le critère est : **0 échec**._

- [ ] **Step 2: Typecheck Nuxt complet**

Run:
```bash
npm run typecheck
```
Expected: 0 erreur. Corriger toute erreur avant de continuer.

- [ ] **Step 3: Démarrer Nuxt et frapper l'API réelle**

Run:
```bash
npm run dev &
sleep 12
echo "--- health via une route ---"
curl -s http://localhost:3000/api/settings/public
echo
echo "--- candidates ---"
curl -s http://localhost:3000/api/candidates | head -c 200
echo
kill %1
```
Expected: `settings/public` renvoie `{"vote_unit_price":...,"currency":...}` et `candidates` renvoie un tableau JSON (nécessite `DATABASE_URL` valide dans `.env`).

- [ ] **Step 4: Supprimer le serveur Hono**

Run:
```bash
git rm -r api/
```
Vérifier `package.json` racine : retirer `hono` et `@hono/node-server` des dependencies **s'ils y figurent** (ils étaient dans `api/package.json`, séparé — vérifier avant de supprimer) :
```bash
node -e "const p=require('./package.json'); console.log('hono?', !!(p.dependencies?.hono))"
```
Si présent : `npm remove hono @hono/node-server`.

- [ ] **Step 5: Relancer la suite complète après suppression**

Run:
```bash
npx vitest run && npm run typecheck
```
Expected: tests 0 échec, typecheck 0 erreur (aucune dépendance vers `api/`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: supprime le serveur Hono, l'API est servie par Nitro"
```

---

## Vérifications de fin de Phase 1

- [ ] `npx vitest run` — 0 échec.
- [ ] `npm run typecheck` — 0 erreur.
- [ ] `npm run dev` sert le front (scaffold) **et** `/api/*` sur le même port 3000.
- [ ] Aucun secret (`service_role`, `DATABASE_URL`, `SEBPAY_SECRET`) dans le bundle client.
- [ ] `api/` supprimé, plus de process séparé sur 8787.

## Suite (hors de ce plan)

Phases 2 (vitrine), 3 (auth + admin/jury), 4 (nettoyage `src/` + quality gate + QA + déploiement Vercel) feront l'objet de plans dédiés, écrits une fois cette fondation posée — leurs détails dépendent du scaffold réel.

## Self-Review notes

- **Couverture spec (design §4 tableau API)** : candidates ✓ (T7), settings ✓ (T8), payment ✓ (T10), votes submit/status/webhook ✓ (T11), sebpay/voteConfirmation/errors/db/types ✓ (T4/T5), contexte serveur-only ✓ (T9). Scaffold + modules (design §2,§3) ✓ (T1-T3).
- **Sécurité service_role serveur-only** (design §3.2, contrainte globale) : runtime config privée (T3) + vérif absence de fuite (T3 step 4, T12 vérif). Régénération de clé = action manuelle notée (T3 step 3).
- **Vitrine non touchée** (design §5) : `src/` intact jusqu'à phase 4. ✓
- **Logique paiement conservée** (design §4 note) : sebpay + voteConfirmation copiés verbatim (T4) ; signature/idempotence testées (T11). ✓
- **Cohérence des types** : `HttpResult`/`ok`/`fail`/`ErrorEntry` définis T5, consommés T7/T8/T10/T11 sous les mêmes noms ; `VoteDeps`/`VoteStatusDeps`/`WebhookDeps` définis et consommés T11 ; `getDb`/`getSebpay`/`getSebpaySecret`/`getPaymentConfig` définis T4/T9 et consommés dans les handlers. ✓
- **Placeholders** : aucun TODO/TBD ; tout code fourni en entier.
