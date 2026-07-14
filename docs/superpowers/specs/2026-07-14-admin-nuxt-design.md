# Admin AWAC — Design (Nuxt + Neon, zéro Supabase)

Date : 2026-07-14 · Statut : approuvé par Emeric

## Objectif

Donner à l'organisateur un espace `/admin` dans l'app Nuxt existante pour :
ajouter/modifier/supprimer des candidats, gérer leurs photos, voir les votes,
voir les montants générés. Base de données unique : **Neon Postgres** (aucun
Supabase, ni auth ni storage). L'ancien SPA `src/` est un legacy non touché.

## 1. Auth admin

- Login email + mot de passe contre la table `admins` existante
  (`password_hash` bcrypt).
- Session : cookie scellé httpOnly/secure (`SESSION_SECRET` env, via
  `useSession` H3). Rien de sensible dans le cookie (id admin + expiration).
- Protection : middleware Nuxt sur `/admin/*` (hors `/admin/login`) +
  helper serveur `requireAdminSession(event)` → 401 sur `server/api/admin/*`.
- Anti-bruteforce : compteur d'échecs en mémoire par IP+email, verrou
  progressif (ex. 5 échecs → 15 min).
- Pages : `/admin/login`, bouton déconnexion dans le layout.

## 2. Photos dans Neon

- Nouvelle table `photo_files (id uuid pk, content_type text, data bytea,
  created_at timestamptz)`.
- Upload : compression côté navigateur (canvas → JPEG max ~1600px) avant
  envoi — plafond requête Vercel 4,5 Mo, et allège Neon. Limite serveur
  ~3 Mo, types acceptés : jpeg/png/webp (vérification magic bytes).
- Diffusion : `GET /api/photos/:id` avec
  `Cache-Control: public, max-age=31536000, immutable` → CDN Vercel absorbe
  le trafic vitrine.
- `candidate_photos.photo_url` = `/api/photos/{id}`,
  `candidate_photos.storage_key` = id du blob. Suppression photo = ligne
  `candidate_photos` + blob. `candidates.profile_photo_url` suit le même
  mécanisme.

## 3. Écrans

Layout admin : sidebar `awac-dark` (Dashboard / Candidats / Votes),
identité admin connecté, déconnexion. Charte AWAC héritée.

- **Dashboard** : votes confirmés (total voix), **montant généré** (somme
  `total_amount` des votes `confirmed`, FCFA), votes pending/rejected,
  top candidats. Source : agrégats SQL sur `votes`/`candidates`.
- **Candidats** : liste (photo, nom, atelier, commune, compteur votes).
  Ajouter (nom obligatoire, atelier, commune, téléphone, photo profil).
  Modifier infos. Gérer photos de réalisations : ajout avec légende,
  suppression, ordre (`photo_order`). Supprimer candidat : confirmation
  forte (saisir le nom) ; transaction qui supprime candidat + photos +
  blobs, **conserve les votes** (audit financier).
- **Votes** : table paginée/filtrable (statut, candidat, recherche code
  reçu), montant par ligne, lien reçu public `/recu/[code]`, totaux par
  statut. Bouton « Réconcilier maintenant » → `reconcilePendingVotes`
  existant.

## 4. API serveur

`server/api/admin/*` = handlers minces sur services purs
(`server/services/admin/*`, retour `{ status, body }`, testés avec les
fakes DB existants) :

- `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me`
- `GET/POST /api/admin/candidates`, `PATCH/DELETE /api/admin/candidates/:id`
- `POST /api/admin/candidates/:id/photos`, `DELETE /api/admin/photos/:id`,
  `PATCH /api/admin/candidates/:id/photos/order`
- `GET /api/admin/votes` (pagination, filtres), `GET /api/admin/stats`
- `POST /api/admin/reconcile`
- Public : `GET /api/photos/:id` (blobs, cache immutable)

## 5. Sécurité & tests

- TDD sur chaque service. Tests sécurité : endpoints admin sans session →
  401 ; bruteforce login verrouillé ; upload non-image/oversize refusé ;
  filtres votes paramétrés (pas d'injection) ; le cookie de session ne
  contient pas le hash.
- Migration SQL versionnée pour `photo_files` (+ seed admin optionnel via
  script, jamais de mot de passe commité).

## Découpage

1. **Tranche 1** — auth (login/session/middleware) + layout admin + dashboard.
2. **Tranche 2** — CRUD candidats + photos Neon + diffusion `/api/photos/:id`.
3. **Tranche 3** — votes & montants (table, filtres, totaux, réconciliation).

Chaque tranche : gate complet (format, tests, typecheck) + QA navigateur.
