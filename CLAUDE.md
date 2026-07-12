# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AWAC MONO** (Awards des Couturier·e·s du Mono) — plateforme de gestion d'un concours de couture, en deux volets :

- **Site vitrine** (`HomeView`, `Navbar`, `Hero`, `Works`, `Vote`, `Prix`, `Footer`) — **terminé et stable**. Ne jamais modifier son design/contenu sans demande explicite.
- **Plateforme d'administration** (jury, notation, candidats, certificats) — en développement.

## Commands

```sh
npm install          # Setup
npm run dev           # Dev server (Vite, hot reload)
npm run build         # Production build
npm run preview       # Preview production build locally
npm run format         # Prettier --write sur src/
```

No test runner or linter script is configured yet.

## Architecture

### Stack
Vue 3 (Composition API) + Vite, Vue Router, Pinia, Tailwind CSS, Supabase (Postgres + Auth + Storage), Chart.js/vue-chartjs, GSAP.

### Layered structure (`src/`)
```
components/    # Site vitrine (Navbar, Hero, Works, Vote, Prix, Footer) — charte graphique officielle, ne pas remplacer
layouts/        # AdminLayout, JuryLayout, PublicLayout
pages/, views/  # Pages publiques (HomeView, AboutView, Login) + views/admin/* et views/jury/*
router/         # Route table + navigation guard (auth/role redirection)
stores/         # Pinia (userStore : session + profil + rôle)
services/       # Appels Supabase (supabase.js, authService.js, juryService.js) — jamais de requête Supabase directe dans un composant
composables/    # Logique métier réutilisable (usePermissions)
config/roles.js # Rôles, permissions, labels, menu — source unique de vérité pour l'autorisation UI
```

Vite alias `@` → `./src` (configuré dans `vite.config.js` et `jsconfig.json`).

### Routing & auth guard (`src/router/index.js`)
Le guard `router.beforeEach` lit la session Supabase et le rôle via `userStore`, puis applique ces règles dans l'ordre :
1. `meta.requiresAuth` sans session → `/admin/login`.
2. `meta.requiresGuest` avec session → `/admin`.
3. Rôle admin sur une route `/jury/*` → redirigé vers `/admin/jury/president`.
4. `jury_member` non-président sur `/admin/*` → redirigé vers `/jury/evaluate`.
5. Président de jury : passe normalement sur `/admin`.
6. `meta.requiresAdmin` sans rôle admin → renvoyé vers `/admin`.

Toute nouvelle route protégée doit déclarer le bon `meta` (`requiresAuth`, `requiresGuest`, `requiresAdmin`) pour rester couverte par ces règles.

### Rôles & permissions (`src/config/roles.js`, `src/composables/usePermissions.js`)
Quatre profils : `super_admin`, `administrator` (alias base `admin`), `moderator`, `jury_member` (dont un sous-cas *président* déterminé par `step_juries.is_president`, pas par `config/roles.js`).
- `PERMISSIONS[role]` définit les droits granulaires (`canView*`/`canManage*`) par domaine (users, jury, scoring, steps, certificates, settings, competitions, candidates, dashboard).
- `usePermissions()` expose `can(permission)`, `isAdmin`, `isSuperAdmin`, `filteredMenuItems`, `roleLabel/roleBadge` — utiliser ce composable côté UI plutôt que de relire `userStore.userRole` directement.
- `normalizeRole()` traite `'admin'` (valeur stockée en base) comme alias de `ROLES.ADMINISTRATOR` : toujours passer par `getPermissions`/`hasPermission`/`isAdminRole`, jamais comparer `role === 'administrator'` en dur.

### Supabase (`src/services/supabase.js`)
- `supabase` : client anon (RLS actives) — usage par défaut.
- `supabaseAdmin` : client `service_role` (bypass RLS) — **à utiliser avec une extrême précaution** ; voir note sécurité ci-dessous.
- `db.*` : helpers CRUD génériques (`get`, `insert`, `update`, `delete`, `count`) avec option `useAdmin`.
- `auth.*` : session, profil courant (jointure `auth.users` + table `profiles`), login/logout.

### Modèle de données (`supabase/`)
- `migrations/0001` à `0010` : schéma complet (competitions → steps → forms/form_fields → form_responses ; candidates → candidate_scores/assignments ; jury_groups → jury_group_members ; certificates ; audit_logs). Voir `supabase/erd/awac_erd.md` pour le diagramme relationnel complet et le détail des colonnes avant toute modification de schéma.
- `policies/`, `triggers/`, `functions/`, `storage/`, `seed/` : RLS, triggers SQL, fonctions SQL, buckets, données de seed.

### Règles métier clés (voir `.github/CONVENTIONS.md` pour le détail complet)
- Chaque compétition a des étapes (`steps`) dont la somme des `percentage` doit toujours valoir 100%.
- Un juré ne peut jamais modifier une note déjà validée ; un modérateur ne voit jamais les signatures officielles.
- Classements Homme/Femme indépendants.
- Mobile Money (MTN/Moov/Celtis) pas encore intégré — votes simulés ; concevoir la logique de vote pour permettre l'intégration future sans la réécrire.
- Attestations de mérite bloquées tant que le concours n'est pas clôturé.
- RLS strictes obligatoires ; toute action sensible doit être tracée dans `audit_logs`.

### Conventions de code
- Composition API partout, composants courts et modulaires.
- Logique métier → composables ; appels Supabase → services ; jamais de requête Supabase directe dans un `.vue`.
- Réutiliser les composants/layouts existants plutôt que d'en dupliquer.

## Security note (read before touching `src/services/supabase.js`)

`supabaseServiceRoleKey` a des **valeurs hardcodées en fallback** (`import.meta.env.VITE_... || 'eyJ...'`) dans un fichier importé côté client. Comme c'est un SPA Vite, ce fichier finit dans le bundle JS livré au navigateur — la clé `service_role` (bypass RLS) est donc potentiellement exposée publiquement sur le site déployé, pas seulement dans le repo. Avant tout travail sur l'auth/Supabase : vérifier que ces fallbacks ont été supprimés et que la clé a été régénérée côté Supabase si ce n'est pas déjà fait.
