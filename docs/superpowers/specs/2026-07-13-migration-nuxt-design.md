# Design — Migration AWAC vers Nuxt

**Date:** 2026-07-13
**Statut:** Approuvé (design), plan d'implémentation à suivre
**Périmètre:** Migration complète du projet (SPA Vue + Vite + API Hono séparée) vers un projet **Nuxt 4** unique (front SSR + API Nitro).

---

## 1. Contexte & motivation

État actuel:
- **Front:** SPA Vue 3 (Composition API) + Vite. 28 composants `.vue`, 18 routes, Vue Router + guard `beforeEach` (6 règles), Pinia (`userStore`), Tailwind, GSAP, Chart.js, Supabase JS.
- **API:** serveur Hono séparé dans `api/` (TypeScript, port 8787). 4 fichiers de routes (`candidates`, `votes`, `payment`, `settings`), lib SebPay, service `voteConfirmation`, 31 tests vitest verts.
- **Déploiement:** Vercel (SPA rewrite via `vercel.json`).

Problèmes qui motivent la migration:
1. **Deux process à lancer** (Vite `:5173` + Hono `:8787`). Oublier l'API casse le front (« Impossible de charger les candidats »).
2. **Pas de "server actions"**: appels HTTP cross-origin avec URL codée en dur (`VITE_API_URL`) et CORS.
3. **Faille sécurité** (déjà signalée dans `CLAUDE.md`): `VITE_SUPABASE_SERVICE_ROLE_KEY` est importée côté client → la clé `service_role` (bypass RLS) finit dans le bundle livré au navigateur.

Objectif: **un seul serveur** (Nuxt/Nitro) servant le front SSR et l'API, avec appels même-origine (`$fetch('/api/...')`), secrets serveur-only, et déploiement Vercel via preset natif.

## 2. Architecture cible

**Nuxt 4** (moteur serveur **Nitro**). Un seul `nuxt.config.ts`. Structure `app/` (front) + `server/` (API).

Modules Nuxt:
- `@pinia/nuxt` — stores (remplace `createPinia()` manuel).
- `@nuxtjs/tailwindcss` — Tailwind intégré (reprend `tailwind.config.js` + tokens existants).
- `@nuxtjs/supabase` — auth SSR (cookies), `useSupabaseClient()`, `useSupabaseUser()`, client serveur `serverSupabaseServiceRole()`, middleware de redirection.

Rendu:
- **Vitrine** (`/`, `/candidat/:id`, `/a-propos`): SSR/SSG — bon pour SEO/perf, rendu identique à l'actuel.
- **Admin/Jury** (`/admin/*`, `/jury/*`): rendu client (SPA-like) derrière auth, comme aujourd'hui.
- GSAP et Chart.js: composants/plugins **`.client`-only** (pas de SSR sur ces libs).

## 3. Gains apportés par Nuxt

1. **Auth simplifiée.** `@nuxtjs/supabase` remplace `router.beforeEach` (6 règles) et le `await userStore.fetchUser()` de `main.js`. La session est gérée en SSR via cookies. Le store de rôle (`userStore`, `usePermissions`, `config/roles`) est conservé et rebranché sur `useSupabaseUser()`. Les 6 règles de redirection deviennent un middleware de route (`app/middleware/auth.ts`).
2. **Sécurité `service_role`.** Le client `service_role` vit **uniquement dans `server/utils/`** (via `serverSupabaseServiceRole()`), jamais importé côté `app/`. La clé passe de `VITE_*` (bundle client) à variable serveur-only. La clé exposée doit être **régénérée côté Supabase** dans le cadre de la migration.
3. **API même-origine.** `$fetch('/api/candidates')` — plus de CORS, plus de `VITE_API_URL`, plus de port séparé.

## 4. Correspondance des dossiers

| Actuel | Nuxt |
|---|---|
| `src/main.js`, `src/App.vue` | supprimés (gérés par Nuxt) ; racine → `app/app.vue` |
| `src/router/index.js` (18 routes, guard) | `app/pages/` (routing par fichiers) + `app/middleware/auth.ts` |
| `src/views/HomeView.vue` | `app/pages/index.vue` |
| `src/views/CandidateView.vue` | `app/pages/candidat/[id].vue` |
| `src/views/AboutView.vue` | `app/pages/a-propos.vue` |
| `src/views/Login.vue` | `app/pages/admin/login.vue` |
| `src/views/AdminLayout.vue`, `src/layouts/*` | `app/layouts/admin.vue`, `app/layouts/jury.vue`, `app/layouts/public.vue` |
| `src/views/admin/*/index.vue` | `app/pages/admin/*/index.vue` |
| `src/views/jury/*` | `app/pages/jury/*` |
| `src/components/*` | `app/components/*` (auto-import) |
| `src/composables/*` | `app/composables/*` (auto-import) |
| `src/stores/*` | `app/stores/*` |
| `src/config/roles.js` | `app/utils/roles.ts` |
| `src/services/supabase.js` (client anon) | `app/utils/supabase` via `useSupabaseClient()` |
| `src/services/supabase.js` (service_role) | `server/utils/supabase.ts` (serveur-only) |
| `src/services/voteService.js`, `authService.js`, `juryService.js` | `app/composables/` ou appels `$fetch('/api/...')` |
| `api/src/app.ts` (Hono) | `nuxt.config.ts` + routes Nitro (le montage Hono disparaît) |
| `api/src/routes/candidates.ts` | `server/api/candidates/index.get.ts`, `server/api/candidates/[id].get.ts` |
| `api/src/routes/votes.ts` | `server/api/votes/index.post.ts`, `server/api/votes/[id]/status.get.ts`, `server/api/votes/webhook.post.ts` |
| `api/src/routes/payment.ts` | `server/api/payment/countries.get.ts`, `server/api/payment/operators.get.ts` |
| `api/src/routes/settings.ts` | `server/api/settings/public.get.ts` |
| `api/src/lib/sebpay.ts`, `errors.ts` | `server/lib/sebpay.ts`, `server/lib/errors.ts` (repris) |
| `api/src/services/voteConfirmation.ts` | `server/services/voteConfirmation.ts` (repris quasi tel quel) |
| `api/src/db.ts` (postgres) | `server/utils/db.ts` |
| `api/src/types.ts` | `server/types.ts` (le typage Hono `AppEnv` disparaît, remplacé par `H3Event`) |
| `api/test/*.test.ts` (31 tests vitest) | `test/server/*.test.ts`, ré-pointés vers `server/` |
| `vite.config.js` | `nuxt.config.ts` |
| `vercel.json` (SPA rewrite) | supprimé — preset Nitro `vercel` |
| `jsconfig.json` | `.nuxt/tsconfig.json` généré (TS) |

Notes de portage API:
- Hono `c.get('db')` / `c.json()` / `sendError(c, ...)` → H3 `event.context` / `return {...}` / `createError({...})`.
- Le contexte injecté par le middleware Hono (`db`, `sebpay`, `sebpaySecret`, `paymentConfig`) devient des helpers **`server/utils/`** — `getDb()`, `getSebpay()`, `getSebpaySecret()`, `getPaymentConfig()` — appelés directement dans chaque handler (idiome Nitro, auto-importés). Pas de middleware Nitro dédié : décision arrêtée pour rester simple et explicite.
- La vérification de signature webhook (HMAC + `timingSafeEqual`) et l'idempotence transactionnelle de `voteConfirmation` sont **conservées à l'identique** (logique paiement critique, ne pas réécrire).

## 5. Contrainte critique — site vitrine

`CLAUDE.md`: *le site vitrine (`HomeView`, `Navbar`, `Hero`, `Works`, `Vote`, `Prix`, `Footer`) est terminé et stable ; ne jamais modifier son design/contenu sans demande explicite.*

Règle de migration: **réorganiser les fichiers sans changer le rendu.** Le HTML/CSS/contenu produit doit être identique avant/après. Validation visuelle (`/qa` ou capture) du vitrine à la fin de la phase concernée. GSAP/Chart passent en client-only pour éviter tout écart SSR.

## 6. Flux de données

- **Public candidats:** page SSR `index.vue` → `useFetch('/api/candidates')` → handler Nitro → `server/utils/db` (postgres) → JSON. Même chose pour `/candidat/[id]`.
- **Vote/paiement:** formulaire → `$fetch('/api/votes', { method: 'POST' })` → handler → SebPay (`server/lib/sebpay`) + insertion vote + polling statut. Webhook SebPay → `POST /api/votes/webhook` (signature vérifiée).
- **Admin/Jury:** `useSupabaseClient()` (RLS actives) pour les lectures/écritures ; actions sensibles (bypass RLS, audit) via handlers `server/api/` utilisant `serverSupabaseServiceRole()`.
- **Auth:** `useSupabaseUser()` réactif ; middleware applique les 6 règles de redirection selon rôle (`config/roles`) + `step_juries.is_president`.

## 7. Approche phasée

Migration **incrémentale**, pas big-bang. Chaque phase = commit + vérification, arrêt possible entre phases.

**Phase 0 — Scaffold.** Installer Nuxt 4 dans le repo (préserver git), configurer `nuxt.config.ts`, modules (Pinia, Tailwind, Supabase), reprendre `tailwind.config.js` + tokens. App qui démarre avec une page vide.

**Phase 1 — API → `server/`.** Porter `api/src/` en `server/api/`, `server/lib/`, `server/services/`, `server/utils/`. Ré-pointer les 31 tests vitest → **tous verts**. Supprimer le serveur Hono séparé et sa dépendance `@hono/node-server`.

**Phase 2 — Vitrine.** Migrer `HomeView` + composants (`Navbar`, `Hero`, `Works`, `Vote`, `Prix`, `Footer`), `CandidateView`, `AboutView` en `app/pages` + `app/components`. GSAP/Chart en client-only. **Valider rendu identique.**

**Phase 3 — Auth + Admin/Jury.** Middleware Supabase (6 règles), migrer `userStore`/`usePermissions`, layouts admin/jury, toutes les vues `admin/*` et `jury/*`.

**Phase 4 — Nettoyage & vérif.** Supprimer `src/`, `vite.config.js`, `main.js`, `vercel.json`, `api/` résiduel, deps mortes (Knip). Quality gate complet (format→lint→clean-code→types→tests→sécurité→audit→design) + QA systématique + build Vercel.

## 8. Tests

- Tests API vitest **conservés** et verts à chaque phase (portés vers `server/`).
- Sécurité paiement (signature webhook, idempotence, double-vote) inchangée et testée.
- QA dynamique du vitrine (rendu identique) + parcours vote + zones auth admin/jury.

## 9. Déploiement

- Preset Nitro **`vercel`** (auto-détecté). `vercel.json` supprimé.
- Variables d'env: secrets serveur (`SUPABASE_SERVICE_ROLE_KEY`, `SEBPAY_*`, `DATABASE_URL`) en runtime config privée ; `SUPABASE_URL`/`SUPABASE_KEY` (anon) publiques. **Régénérer la clé `service_role`** exposée.

## 10. Risques & réversibilité

- Grosse migration (28 composants, auth, API, paiement) — plusieurs sessions.
- Réversible via git (branche dédiée, commit par phase).
- Risque principal: régression visuelle du vitrine (mitigé par validation avant/après) et régression logique paiement (mitigé par conservation à l'identique + tests).

## 11. Hors périmètre (YAGNI)

- Pas de refonte de la charte / du design du vitrine.
- Pas de réécriture de la logique métier SebPay / votes (portée telle quelle).
- Pas de nouvelles fonctionnalités — migration à iso-fonctionnel.
- Pas de changement du schéma Supabase / des migrations SQL.
