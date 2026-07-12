# Migration awac : Supabase → Neon + Cloudflare Workers

**Date** : 2026-07-12
**Statut** : Approuvé, prêt pour plan d'implémentation

## Contexte

Le projet awac (AWAC MONO — concours de couture) est actuellement un SPA Vue 3/Vite 100% client-side qui parle directement à Supabase (`@supabase/supabase-js`) pour l'auth, les données (Postgres + RLS) et le storage (photos candidats). Une clé `service_role` s'est retrouvée hardcodée dans le code client, bundlée et exposée publiquement — ce qui a déclenché la décision de sortir de Supabase.

Décision : remplacer Supabase entièrement par **Neon** (Postgres) + **Cloudflare Workers** (backend API) + **Cloudflare R2** (storage), avec une auth maison.

Le projet est **pré-lancement** : aucune donnée réelle en production (candidats, votes, comptes jury). Pas de script de migration de données nécessaire — uniquement le schéma.

## Architecture cible

```
Vue 3 SPA (Vite) — hébergé Vercel (déjà en place, inchangé)
        │  fetch()  Authorization: Bearer <JWT>
        ▼
Cloudflare Worker (Hono) — API REST
        │  @neondatabase/serverless (driver HTTP, pas de TCP)
        ▼
Neon Postgres (projet "awac", région AWS eu-west-2 London — déjà créé)
        +
Cloudflare R2 — photos candidats / créations
```

Le site vitrine (Navbar, Hero, Works, Vote, Prix, Footer) reste inchangé — il ne consomme pas Supabase aujourd'hui et n'est pas concerné par cette migration.

## Pourquoi cette stack (résumé des choix faits en amont)

- **Backend obligatoire** : un connection string Postgres ne doit jamais être exposé au navigateur. Neon = Postgres brut, donc un serveur intermédiaire est requis (contrairement à Supabase qui expose un client sûr côté navigateur via RLS + clé anon).
- **Cloudflare Workers plutôt que Railway/Vercel Functions** : volume attendu ~100k requêtes/jour.
  - Vercel Hobby : cap dur à 1M invocations/**mois** (~33k/jour en moyenne) → dépassé dès le ~10e jour à ce volume, et CGU "personal non-commercial use only".
  - Railway : $5 de crédit gratuit, expire à 30 jours ou épuisement — pas tenable en continu à ce volume.
  - Cloudflare Workers Free : **100 000 requêtes/jour, gratuit en continu**, pas de carte bancaire requise. Bonus pour un site de vote : édge distribué (pas de cold start, bon pour les pics de trafic en fin de concours) + anti-DDoS/anti-bot Cloudflare inclus.
- **Neon** : déjà provisionné (projet "awac", région `eu-west-2` / London — meilleure latence vers le Bénin/Afrique de l'Ouest que les régions US, via les câbles sous-marins UK–Afrique de l'Ouest).
- **R2** plutôt que Vercel Blob : cohérent avec l'écosystème Cloudflare déjà choisi pour le compute, binding natif depuis le Worker, pas de credentials S3 séparés à gérer.

## Composants détaillés

### 1. API (Cloudflare Worker + Hono)

Un seul Worker, routes REST regroupées par domaine métier :

- `/auth` — login, refresh (si ajouté plus tard), logout côté client (suppression du token)
- `/candidates` — CRUD candidats + upload photo (proxy vers R2)
- `/competitions`, `/steps` — gestion des étapes et % de notation
- `/scoring` — soumission/consultation des notes de jury
- `/votes` — vote public (simulé, pas de vrai Mobile Money pour l'instant)
- `/jury` — groupes de jury, présidents, assignations
- `/certificates` — génération attestations (bloqué tant que le concours n'est pas clôturé, règle métier existante)

Chaque route passe par un middleware d'autorisation qui :
1. Décode et vérifie le JWT (signature + expiration).
2. Résout le rôle de l'utilisateur (`super_admin`, `administrator`/`admin`, `moderator`, `jury_member`, + statut président dérivé de `step_juries.is_president`).
3. Vérifie la permission requise via la même matrice que `src/config/roles.js` (portée côté serveur — source unique de vérité pour l'autorisation, réutilisée telle quelle plutôt que dupliquée).

### 2. Authentification (maison, JWT + bcrypt)

- Table `profiles` : `email`, `password_hash` (bcrypt), `role`, `full_name`.
- `POST /auth/login` : vérifie bcrypt, signe un JWT (HS256, secret dans une variable d'env Worker `JWT_SECRET`), expiration **7 jours**.
- Le client stocke le token côté SPA et l'envoie en `Authorization: Bearer <token>` sur chaque requête. Pas de cookie cross-domain : SPA (Vercel) et API (Workers) sont sur des domaines différents, un bearer token évite les complications CORS/SameSite d'un cookie cross-site.
- Pas de refresh token dans cette v1 (YAGNI) — expiration 7j jugée suffisante pour ce cas d'usage (outil interne jury/admin + vote public simulé, pas une app bancaire). Reconnectable si le token expire.

### 3. Autorisation : abandon des RLS Postgres

Les policies actuelles (`supabase/policies/`) reposent sur `auth.uid()`, une fonction spécifique à Supabase Auth qui n'existe pas sur Neon brut. Plutôt que de réimplémenter un équivalent RLS complexe, l'autorisation est portée **entièrement par le middleware du Worker** (voir §1). C'est un choix délibéré de simplicité (YAGNI) : le Worker est le seul point d'accès à la base (Neon n'est jamais exposé directement), donc l'enforcement applicatif est suffisant. Défense en profondeur (RLS Postgres réintroduite) pourra être ajoutée plus tard si le besoin se confirme, mais n'est pas nécessaire pour le lancement.

### 4. Schéma de données

Les 10 migrations SQL existantes (`supabase/migrations/0001_initial_schema.sql` → `0010_form_responses.sql`) sont du Postgres standard (types, contraintes, index) — elles se rejouent telles quelles sur Neon, sans adaptation de schéma. Seules les policies RLS (`0002_rls_policies.sql` et équivalents) ne sont pas reprises (voir §3). Le diagramme relationnel complet reste celui documenté dans `supabase/erd/awac_erd.md`.

Pas de script d'export/import de données : projet pré-lancement, aucune donnée réelle à préserver.

### 5. Storage (Cloudflare R2)

Remplace Supabase Storage pour les photos candidats et créations. Binding R2 direct depuis le Worker (pas de credentials S3 à gérer côté client ni côté secrets applicatifs séparés). Upload : le client envoie le fichier au Worker (`/candidates/:id/photo`), qui l'écrit dans le bucket R2 et enregistre la clé résultante dans la table existante `candidate_photos` (colonnes `candidate_id`, `photo_type` — enum `profile`/`creation` —, `is_primary`, `is_approved`), conformément au schéma déjà défini dans `supabase/migrations/0003_candidates_and_photos.sql`.

### 6. Règles métier conservées (inchangées, portées dans le Worker)

- Somme des `percentage` des étapes d'une compétition = 100%.
- Un juré ne peut jamais modifier une note déjà validée.
- Un modérateur ne voit jamais les signatures officielles.
- Classements Homme/Femme indépendants.
- Attestations de mérite bloquées tant que le concours n'est pas clôturé.
- Vote : Mobile Money (MTN/Moov/Celtis) toujours simulé — la logique de vote est conçue pour permettre l'intégration future sans réécriture (contrat d'interface stable entre le endpoint `/votes` et un futur provider de paiement).
- Anti-fraude vote : contrainte `UNIQUE` en base (candidat_id, identifiant votant) + vérification applicative. Le recalcul de classement n'est **pas** fait sur le chemin critique du vote (job séparé / à la demande) pour rester sous la limite de 10ms CPU/requête du plan gratuit Workers.

### 7. Gestion d'erreurs

Réponses JSON uniformes :
```json
{ "error": { "code": "invalid_credentials", "message": "Email ou mot de passe incorrect" } }
```
Jamais de stack trace, de message Postgres brut, ni de détail interne renvoyé au client (cohérent avec la règle globale du projet contre la fuite d'information).

### 8. Tests

Aucun test runner n'est configuré dans awac actuellement — à ajouter (Vitest, cohérent avec le reste de l'écosystème du repo).
- **Unitaires** : hash/vérification bcrypt, signature/vérification JWT, matrice de permissions (`src/config/roles.js` réutilisée côté serveur).
- **Intégration** : endpoints critiques (`/auth/login`, `/votes`, `/scoring`) contre une branche Neon dédiée aux tests (Neon supporte le branching de BD nativement — permet de tester sans toucher aux données de dev/prod).

## Hors scope (explicitement exclu de cette migration)

- Intégration Mobile Money réelle (MTN/Moov/Celtis) — reste simulée comme avant.
- Toute modification du site vitrine (design, contenu, composants existants) — stable, à ne jamais toucher sans demande explicite (règle déjà actée dans `.github/CONVENTIONS.md`).
- Refresh token / rotation de session avancée.
- RLS Postgres au niveau base (reportée, voir §3).

## Risques identifiés

- **Limite CPU Workers (10ms/requête, plan gratuit)** : à surveiller sur les routes qui agrègent beaucoup de données (ex: dashboard admin, classements). Mitigation : caching / calcul asynchrone plutôt que recalcul synchrone à chaque requête.
- **Limite 100k requêtes/jour** : filet de sécurité pas cher si dépassé (plan payant Workers = 5$/mois pour 10M requêtes) — pas bloquant pour le lancement.
- **JWT sans refresh** : un utilisateur devra se reconnecter après 7 jours d'inactivité — acceptable pour ce cas d'usage, à revisiter si ça gêne l'expérience jury/admin en pratique.
