# Migration Nuxt — Phase 2 (Site vitrine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Migrer le site vitrine (public) de la SPA Vite (`src/`) vers Nuxt (`app/`), à rendu **identique**, en rebranchant ses appels API sur `/api/*` same-origin (Nitro).

**Architecture:** Les composants vitrine sont **déplacés verbatim** (aucun changement de design/markup/style). Seuls changent : (a) les chemins d'import d'assets, (b) les appels API (`VITE_API_URL:8787` → `$fetch('/api/*')` same-origin), (c) le routing (Vue Router → pages Nuxt), (d) le chargement des polices (index.html → `nuxt.config` head). GSAP n'est PAS utilisé dans le vitrine (seulement admin/dashboard, hors périmètre).

**Tech Stack:** Nuxt 4, Vue 3 SFC (JS, pas de conversion TS des composants vitrine), `$fetch`/`useFetch`, Tailwind (déjà configuré en Phase 0).

## Global Constraints

- **RENDU IDENTIQUE — non négociable.** Le vitrine est terminé et stable (CLAUDE.md). La migration ne doit RIEN changer au design, contenu, markup, classes, styles, textes, images, animations CSS. Toute divergence visuelle = échec. Validation visuelle avant/après obligatoire (curl HTML + inspection).
- Composants vitrine restent des **SFC Vue en JS** (`<script setup>` sans `lang="ts"`) — copie verbatim, pas de réécriture ni de typage.
- API same-origin uniquement : plus aucune référence à `VITE_API_URL` ni au port `8787` dans le vitrine migré. Endpoints : `/api/candidates`, `/api/candidates/:id`, `/api/votes`, `/api/votes/:id/status`, `/api/payment/countries`, `/api/payment/operators`, `/api/settings/public`.
- Ne PAS toucher `src/` (l'ancien front reste en place jusqu'à la Phase 4 de nettoyage). On COPIE vers `app/`, on ne déplace pas encore.
- Ne PAS toucher `server/` ni la logique API (Phase 1, figée).
- Nommage/commits : conventional commits.

## File Structure

Créés :
- `nuxt.config.ts` (modifié) : `app.head` (polices Google Fonts + Material Icons/Symbols, titre, lang fr), retrait de la page scaffold.
- `app/assets/css/main.css` (fusion de `src/assets/main.css` dans l'entrée Tailwind existante `app/assets/css/tailwind.css`, ou import).
- `app/assets/img/` : copie de `src/assets/img/` (candidat/, icons/, awac.png).
- `app/utils/api.ts` : client `$fetch` same-origin + `ApiError` (portage de `src/services/api.js`, partie publique).
- `app/composables/useVoteService.ts` OU `app/utils/voteService.ts` : `getCandidates`, `getCandidate`, `submitVote`, `getVoteStatus`, `getCountries`, `getOperators`, `getPublicSettings` → `/api/*`.
- `app/components/` : `Navbar.vue`, `Hero.vue`, `Works.vue`, `Vote.vue`, `VoteModal.vue`, `Prix.vue`, `Footer.vue` (copies verbatim, imports ajustés).
- `app/pages/index.vue` : HomeView (Navbar+Hero+Works+Vote+Prix+Footer via auto-import).
- `app/pages/candidat/[id].vue` : CandidateView.
- `app/pages/a-propos.vue` : AboutView.
- `app/layouts/public.vue` si un wrapper commun est nécessaire (sinon, `app.vue` = `<NuxtPage />` suffit).

Non touchés : `src/`, `server/`.

---

## Task 1: Polices, CSS global, assets

**Files:**
- Modify: `nuxt.config.ts`
- Create: `app/assets/css/main.css` (ou fusion dans `tailwind.css`), `app/assets/img/**` (copie)
- Modify: `app/pages/index.vue` (retire le scaffold temporaire — remplacé en Task 5)

**Interfaces:**
- Produces: mêmes polices (Montserrat, Open Sans, Material Icons, Material Symbols) et mêmes styles de base (`body { bg-gray-50 text-awac-dark }`, font Open Sans) que l'ancien vitrine.

- [ ] **Step 1: Répliquer les polices + head dans nuxt.config.ts**

Dans `nuxt.config.ts`, ajouter (au même niveau que `modules`) un bloc `app.head` reproduisant EXACTEMENT les `<link>` de `src/index.html` :
```ts
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'AWAC',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Open+Sans:wght@300;400;500;600;700&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/icon?family=Material+Icons' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined' },
      ],
    },
  },
```
Note : ces polices sont chargées depuis des domaines externes (fonts.googleapis.com) — c'est le comportement actuel du vitrine, à préserver à l'identique.

- [ ] **Step 2: Copier les styles globaux**

Lire `src/assets/main.css` en entier. Fusionner son contenu (hors les 3 directives `@tailwind` déjà présentes dans `app/assets/css/tailwind.css`) dans `app/assets/css/tailwind.css`, en conservant EXACTEMENT les mêmes règles `@layer base` (body, etc.). Si `src/assets/main.css` contient des règles malformées, les recopier telles quelles (rendu identique prime — ne pas "corriger"). Vérifier que `css: ['~/assets/css/tailwind.css']` est bien dans `nuxt.config.ts` (Phase 0).

- [ ] **Step 3: Copier les assets images**

```bash
mkdir -p app/assets/img
cp -R src/assets/img/. app/assets/img/
```
(Les composants référencent ces images ; les chemins d'import seront ajustés en Task 3-4.)

- [ ] **Step 4: Vérifier le démarrage + head**

```bash
npm run dev &
sleep 10
curl -s http://localhost:3000/ | grep -q "Montserrat" && echo "FONTS HEAD OK"
kill %1
```
Expected: `FONTS HEAD OK`.

- [ ] **Step 5: Commit**

```bash
git add nuxt.config.ts app/assets/
git commit -m "feat(vitrine): polices, CSS global et assets du site vitrine"
```

---

## Task 2: Client API same-origin + voteService

**Files:**
- Create: `app/utils/api.ts`, `app/utils/voteService.ts`
- Test: `test/app/voteService.test.ts` (optionnel selon faisabilité — voir Step)

**Interfaces:**
- Consumes: endpoints Nitro `/api/*` (Phase 1).
- Produces:
  - `class ApiError extends Error { code; status }`
  - `api.get(path)`, `api.post(path, body)` via `$fetch` same-origin
  - `voteService.getCandidates()`, `.getCandidate(id)`, `.submitVote(payload)`, `.getVoteStatus(id)`, `.getCountries()`, `.getOperators(country)`, `.getPublicSettings()`

- [ ] **Step 1: Client api.ts (portage same-origin de src/services/api.js)**

Créer `app/utils/api.ts`. Reprendre la logique de `src/services/api.js` MAIS : base URL = same-origin `/api` (pas de `VITE_API_URL`), via `$fetch` (auto-importé par Nuxt). Conserver `ApiError` (code/message/status) et le mapping d'erreur `{ error: { code, message } }` (l'enveloppe est garantie par le fix Phase 1). Partie auth/token (localStorage Bearer) : NON requise pour le vitrine public — l'omettre ici (elle reviendra en Phase 3 pour l'admin). `$fetch` throw sur status≥400 : mapper l'erreur en `ApiError` en lisant `error.data?.error?.code/message`.

```ts
export class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function request<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  try {
    return await $fetch<T>(`/api${path}`, {
      method: (opts.method ?? 'GET') as never,
      body: opts.body as never,
    })
  } catch (err: unknown) {
    const e = err as { data?: { error?: { code?: string; message?: string } }; statusCode?: number }
    const code = e.data?.error?.code ?? 'unknown_error'
    const message = e.data?.error?.message ?? 'Une erreur est survenue'
    throw new ApiError(code, message, e.statusCode ?? 500)
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
}
```

- [ ] **Step 2: voteService.ts**

Créer `app/utils/voteService.ts` reproduisant `src/services/voteService.js` sur les nouveaux endpoints :
```ts
import { api } from './api'

export const voteService = {
  getCandidates: () => api.get('/candidates'),
  getCandidate: (id: string) => api.get(`/candidates/${id}`),
  submitVote: (payload: unknown) => api.post('/votes', payload),
  getVoteStatus: (id: string) => api.get(`/votes/${id}/status`),
  getCountries: () => api.get('/payment/countries'),
  getOperators: (country: string) => api.get(`/payment/operators?country=${encodeURIComponent(country)}`),
  getPublicSettings: () => api.get('/settings/public'),
}
```
(Vérifier les endpoints exacts consommés par `src/components/Vote.vue`, `VoteModal.vue`, `CandidateView.vue` et refléter leurs signatures — lire ces fichiers pour confirmer les payloads.)

- [ ] **Step 3: Vérifier typecheck**

```bash
npm run typecheck
```
Expected: exit 0 (warnings bénins ignorés).

- [ ] **Step 4: Commit**

```bash
git add app/utils/api.ts app/utils/voteService.ts
git commit -m "feat(vitrine): client API same-origin + voteService (/api/*)"
```

---

## Task 3: Composants présentiels (Navbar, Hero, Works, Prix, Footer)

**Files:**
- Create: `app/components/Navbar.vue`, `Hero.vue`, `Works.vue`, `Prix.vue`, `Footer.vue`

**Interfaces:**
- Produces: mêmes composants, rendu identique, auto-importés par Nuxt.

- [ ] **Step 1: Copier verbatim chaque composant**

Pour CHACUN de `Navbar.vue`, `Hero.vue`, `Works.vue`, `Prix.vue`, `Footer.vue` :
```bash
cp src/components/<Name>.vue app/components/<Name>.vue
```
Puis dans la copie, ajuster UNIQUEMENT :
- Imports d'assets : `@/assets/img/...` → `~/assets/img/...` (alias Nuxt) OU `import img from '~/assets/img/...'`. Vérifier comment chaque composant référence les images (import statique vs chemin string) et adapter au minimum pour que l'image se charge — SANS changer le rendu.
- Imports de composants frères (si un composant importe un autre) : les retirer (auto-import Nuxt) OU les laisser (Nuxt tolère les imports explicites). Préférer retirer pour rester idiomatique.
- NE RIEN changer d'autre : markup, classes, styles `<style scoped>`, textes, logique.

**Ne pas** convertir en TS. Garder `<script setup>` JS.

- [ ] **Step 2: Vérifier qu'aucune dépendance API ne traîne**

Ces 5 composants sont présentiels. Confirmer via grep qu'ils n'appellent pas l'API (sinon, le composant relève de la Task 4) :
```bash
grep -l "voteService\|api\.\|\$fetch\|/candidates" app/components/{Navbar,Hero,Works,Prix,Footer}.vue || echo "présentiels OK"
```

- [ ] **Step 3: Commit**

```bash
git add app/components/Navbar.vue app/components/Hero.vue app/components/Works.vue app/components/Prix.vue app/components/Footer.vue
git commit -m "feat(vitrine): composants présentiels (Navbar/Hero/Works/Prix/Footer)"
```

---

## Task 4: Composants fonctionnels (Vote, VoteModal)

**Files:**
- Create: `app/components/Vote.vue`, `app/components/VoteModal.vue`

**Interfaces:**
- Consumes: `voteService` (Task 2).
- Produces: mêmes composants, rendu identique, appels API repointés sur `/api/*`.

- [ ] **Step 1: Lire les composants sources pour cartographier leurs appels**

Lire `src/components/Vote.vue` et `src/components/VoteModal.vue` en entier. Recenser tous les appels à `voteService`/`api` et leurs signatures (getCandidates, submitVote, getVoteStatus, getCountries, getOperators, getPublicSettings, etc.).

- [ ] **Step 2: Copier verbatim + repointer les imports**

```bash
cp src/components/Vote.vue app/components/Vote.vue
cp src/components/VoteModal.vue app/components/VoteModal.vue
```
Dans les copies, ajuster UNIQUEMENT :
- `import { voteService } from '@/services/voteService'` → `import { voteService } from '~/utils/voteService'` (ou auto-import si exposé). Vérifier que les méthodes appelées existent dans le `voteService` de Task 2 ; compléter Task 2 si un endpoint manque.
- Imports d'assets/icônes → alias `~/`.
- Import de `VoteModal` dans `Vote.vue` → retirer (auto-import) ou laisser.
- NE RIEN changer d'autre (markup, états loading/error/success, textes, styles).

- [ ] **Step 3: Vérifier typecheck (les composants JS ne bloquent pas, mais les utils TS oui)**

```bash
npm run typecheck
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/components/Vote.vue app/components/VoteModal.vue
git commit -m "feat(vitrine): composants Vote/VoteModal repointés sur /api/*"
```

---

## Task 5: Pages (index, candidat/[id], a-propos)

**Files:**
- Create: `app/pages/index.vue`, `app/pages/candidat/[id].vue`, `app/pages/a-propos.vue`
- Modify: `app/app.vue` si besoin (doit être `<NuxtPage />` ; layout public optionnel)

**Interfaces:**
- Consumes: composants (Task 3-4), voteService (Task 2).
- Produces: routes `/`, `/candidat/:id`, `/a-propos` au rendu identique à l'ancien Vue Router.

- [ ] **Step 1: index.vue = HomeView**

Créer `app/pages/index.vue` avec le template de `src/views/HomeView.vue` (Navbar/Hero/Works/Vote/Prix/Footer), SANS les imports explicites (auto-import Nuxt) :
```vue
<template>
  <Navbar />
  <Hero />
  <Works />
  <Vote />
  <Prix />
  <Footer />
</template>
```

- [ ] **Step 2: candidat/[id].vue = CandidateView**

```bash
cp src/views/CandidateView.vue app/pages/candidat/[id].vue
```
Ajuster : `import { voteService } from '@/services/voteService'` → `~/utils/voteService` ; `route.params.id` via `useRoute()` (auto-importé) ; imports d'assets → `~/`. Vérifier que la récupération du param `id` fonctionne (Nuxt `useRoute().params.id`). NE RIEN changer au rendu.

- [ ] **Step 3: a-propos.vue = AboutView**

```bash
cp src/views/AboutView.vue app/pages/a-propos.vue
```
(220 octets — trivial.) Ajuster imports éventuels.

- [ ] **Step 4: Vérifier les routes**

```bash
npm run dev &
sleep 10
curl -s -o /dev/null -w "/ %{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "/a-propos %{http_code}\n" http://localhost:3000/a-propos
kill %1
```
Expected: `200` pour les deux.

- [ ] **Step 5: Commit**

```bash
git add app/pages/
git commit -m "feat(vitrine): pages index / candidat[id] / a-propos"
```

---

## Task 6: Validation rendu identique + parcours vote + nettoyage vérif

**Files:** aucun nouveau (validation + corrections ciblées)

- [ ] **Step 1: Validation visuelle du vitrine (rendu identique)**

Démarrer `npm run dev`. Comparer la home Nuxt (`:3000/`) au vitrine d'origine. Idéalement via `/qa` ou capture : vérifier Navbar, Hero, Works, Vote (liste candidats chargée depuis `/api/candidates`), Prix, Footer — mêmes couleurs, polices, espacements, textes, images. Consigner tout écart et le corriger (cause = chemin d'asset cassé, style manquant, police non chargée). **Aucun écart visuel toléré.**

- [ ] **Step 2: Parcours vote fonctionnel**

Contre l'API réelle (DB configurée) : la section Vote liste les candidats ; ouvrir VoteModal ; simuler un vote (mode simulé ou opérateur demo) → statut confirmé. Vérifier console/logs propres. Vérifier `/candidat/:id` (fiche + photos).

- [ ] **Step 3: typecheck + tests serveur**

```bash
npm run typecheck   # exit 0
npx vitest run      # 42/42 (les tests serveur ne doivent pas régresser)
```

- [ ] **Step 4: Commit (si corrections)**

```bash
git add -A
git commit -m "fix(vitrine): corrections de rendu/parcours après validation"
```

(Note : `src/` n'est PAS supprimé ici — le nettoyage complet + retrait de `src/`, `main.js`, `vite.config.js`, dépendances mortes, se fait en Phase 4 après la migration admin/jury.)

---

## Vérifications de fin de Phase 2

- [ ] Home + candidat + a-propos servies par Nuxt, rendu identique à l'ancien vitrine.
- [ ] Vote/candidats fonctionnels via `/api/*` same-origin (plus de `:8787`).
- [ ] `npm run typecheck` exit 0 ; `npx vitest run` 42/42.
- [ ] `src/` toujours en place (retiré en Phase 4).

## Self-Review notes

- Couverture design §5 (rendu identique) : gate visuel Task 6 Step 1. ✓
- Reconnexion API same-origin (design §3.3) : Task 2 + Task 4. ✓
- GSAP client-only : sans objet pour le vitrine (non utilisé). ✓
- Composants copiés verbatim (contrainte "ne pas modifier le vitrine") : Task 3-5. ✓
- Types : `ApiError`/`api`/`voteService` définis Task 2, consommés Task 4-5. ✓
- Placeholders : les composants vitrine sont des copies verbatim (trop volumineux pour être ré-inscrits ici) — c'est un déplacement, pas une réécriture ; les seuls changements (imports assets/API) sont explicités par task.
