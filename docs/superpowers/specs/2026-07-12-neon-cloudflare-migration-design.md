# Migration awac : Supabase → Neon + Cloudflare Workers

**Date** : 2026-07-12
**Statut** : Approuvé, prêt pour plan d'implémentation

## Contexte

Le projet awac (AWAC MONO — concours de couture) est actuellement un SPA Vue 3/Vite 100% client-side qui parle directement à Supabase (`@supabase/supabase-js`) pour l'auth, les données (Postgres + RLS) et le storage (photos candidats). Une clé `service_role` s'est retrouvée hardcodée dans le code client, bundlée et exposée publiquement — ce qui a déclenché la décision de sortir de Supabase.

Décision : remplacer Supabase entièrement par **Neon** (Postgres) + **Cloudflare Workers** (backend API) + **Cloudflare R2** (storage), avec une auth maison.

Le projet est **pré-lancement** : aucune donnée réelle en production. Pas de script de migration de données nécessaire — uniquement le schéma.

## Objectif produit (redéfini)

Site de **vote en ligne pour un concours d'apprentis couturiers**, avec trois surfaces :

1. **Site public** : présentation des candidats, vote payant (site vitrine inchangé — composants `Navbar`/`Hero`/`Works`/`Vote`/`Prix`/`Footer` déjà stables).
2. **Dashboard admin** (organisateur) : nombre de votes (total + par candidat), revenu généré (total + par candidat), ajout/suppression/mise à jour des candidats, gestion des critères de notation, gestion des comptes jury, réglage de la pondération vote/jury.
3. **Application jury** : notation des candidats selon des critères configurables, avec appréciations et fautes en commentaire libre.

Ceci **remplace** la portée précédemment documentée dans `.github/CONVENTIONS.md` (étapes à %, formulaires dynamiques type Google Forms, certificats, groupes de jury avec président, notifications, logs d'audit) — jugée trop complexe pour le besoin réel. Cette v1 est volontairement plus simple ; ces fonctionnalités pourront être ajoutées plus tard si le besoin se confirme, sans que l'architecture (Worker + Neon + R2) n'ait à changer.

## Architecture technique

```
Vue 3 SPA (Vite) — hébergé Vercel (déjà en place, inchangé)
        │  fetch()  Authorization: Bearer <JWT>
        ▼
Cloudflare Worker (Hono) — API REST
        │  @neondatabase/serverless (driver HTTP, pas de TCP)
        ▼
Neon Postgres (projet "awac", région AWS eu-west-2 London — déjà créé)
        +
Cloudflare R2 — photos candidats (profil + travaux)
```

## Pourquoi cette stack

- **Backend obligatoire** : un connection string Postgres ne doit jamais être exposé au navigateur. Neon = Postgres brut, donc un serveur intermédiaire est requis.
- **Cloudflare Workers** plutôt que Railway/Vercel Functions pour ~100k requêtes/jour attendues :
  - Vercel Hobby : cap dur à 1M invocations/**mois** (~33k/jour en moyenne) → dépassé au ~10e jour à ce volume, et CGU "personal non-commercial use only".
  - Railway : $5 de crédit gratuit, expire à 30 jours ou épuisement — pas tenable en continu.
  - Cloudflare Workers Free : **100 000 requêtes/jour, gratuit en continu**, pas de carte bancaire requise. Edge distribué (pas de cold start, bon pour les pics de trafic en fin de concours) + anti-DDoS/anti-bot Cloudflare inclus — pertinent pour un site de vote public.
- **Neon** : déjà provisionné (projet "awac", région `eu-west-2` / London — meilleure latence Bénin/Afrique de l'Ouest que les régions US).
- **R2** : cohérent avec l'écosystème Workers déjà choisi, binding natif, pas de credentials S3 séparés.

## Modèle de données

```
admins              id, email, password_hash, full_name, created_at

jury_members        id, username, password_hash, full_name, is_active,
                     created_by → admins, created_at

candidates          id, full_name, atelier, commune, phone,
                     profile_photo_url, created_at, updated_at

candidate_photos     id, candidate_id → candidates, photo_url, caption,
                     photo_order, created_at
                     — plusieurs photos par candidat (travaux, créations, présentation),
                       nombre illimité, ordonnables

criteria             id, name, description, weight_percentage, created_at
                     — configurable par l'admin, somme des weight_percentage = 100%

evaluations          id, candidate_id → candidates, jury_id → jury_members,
                     submitted_at, is_locked, created_at, updated_at
                     — une évaluation = un passage d'un juré sur un candidat

evaluation_scores    evaluation_id → evaluations, criterion_id → criteria, score

evaluation_notes     evaluation_id → evaluations, type (appreciation | fault), content
                     — appréciations et fautes du juré, texte libre

votes                id, candidate_id → candidates, quantity, unit_price,
                     total_amount, currency, payment_provider, payment_status,
                     payment_reference, created_at
                     — un vote payant = achat d'une quantité de voix pour un candidat

settings             vote_weight_percentage, jury_weight_percentage,
                     vote_unit_price, currency
                     — réglages globaux modifiables par l'admin
```

Rôles simplifiés par rapport à l'ancien schéma : uniquement **admin** (un seul, crée les comptes jury) et **jury_member** (note, ne gère rien d'autre). Pas de `super_admin`/`moderator`/président de jury/groupes — ce découpage n'existe plus dans cette v1.

### Classement combiné

Calculé à la volée (jamais stocké), pour que changer les pourcentages dans `settings` reflète instantanément le classement :

```
score_jury_normalisé(candidat)  = moyenne pondérée des evaluation_scores
                                    (pondération par criteria.weight_percentage),
                                    ramenée sur 100
score_vote_normalisé(candidat)  = votes du candidat / votes du candidat en tête × 100
score_final(candidat)           = settings.jury_weight_percentage% × score_jury_normalisé
                                 + settings.vote_weight_percentage%  × score_vote_normalisé
```

Le dashboard admin affiche les trois valeurs séparément (score jury, score vote, score combiné) pour chaque candidat, pas seulement le score final.

### Verrouillage des notes

Une fois `evaluations.is_locked = true` (juré soumet définitivement sa notation d'un candidat), plus aucune modification possible — règle métier reprise de la version précédente.

### Portée volontairement exclue de cette v1

- Catégories Homme/Femme séparées (un seul classement général pour l'instant).
- Éditions/sessions multiples (concours unique, pas d'archivage annuel pour l'instant).
- Assignation de candidats spécifiques à des jurés (chaque juré voit et note tous les candidats).
- Approbation/modération des photos avant publication (upload direct, pas de workflow de validation).

Ces points sont ajoutables plus tard sans remise en cause du schéma de base (ajout de colonnes/tables, pas de refonte).

## Composants applicatifs

### 1. API (Cloudflare Worker + Hono)

Un seul Worker, routes REST par domaine :

- `/auth` — login admin/jury
- `/candidates` — CRUD candidats (admin), upload photos (admin), lecture publique (site vitrine)
- `/criteria` — CRUD critères de notation (admin)
- `/evaluations` — soumission de notes + appréciations/fautes (jury), lecture (admin, jury sur ses propres évaluations)
- `/votes` — achat de votes (public, paiement simulé pour l'instant)
- `/settings` — lecture/écriture des pondérations et du prix du vote (admin)
- `/dashboard` — agrégats prêts à afficher (total votes, revenu, classement) pour éviter de recalculer côté client

Middleware d'autorisation par route : décode le JWT, vérifie le rôle (`admin` ou `jury_member`), refuse sinon (403).

### 2. Authentification (maison, JWT + bcrypt)

- `admins.password_hash` / `jury_members.password_hash` en bcrypt.
- `POST /auth/login` : vérifie bcrypt, signe un JWT (HS256, secret dans variable d'env Worker `JWT_SECRET`), expiration **7 jours**, contient `{ sub, role }`.
- Bearer token côté client (pas de cookie cross-domain, SPA et API sur domaines différents).
- Pas de refresh token en v1 (YAGNI) — reconnexion après expiration si besoin.

### 3. Storage (Cloudflare R2)

Binding R2 direct depuis le Worker. Deux usages :
- `candidates.profile_photo_url` — une photo de profil par candidat, remplaçable.
- `candidate_photos` — table dédiée, plusieurs photos par candidat (travaux/créations/présentation), chacune avec sa propre clé R2.

### 4. Vote payant

- Prix fixe par vote (`settings.vote_unit_price`), achat en quantité choisie par le votant en une transaction.
- Paiement Mobile Money **simulé** pour l'instant (`payment_status = 'simulated'`) — le schéma prévoit déjà `payment_provider`/`payment_reference` pour brancher MTN/Moov/Celtis plus tard sans changer la table.

### 5. Gestion d'erreurs

Réponses JSON uniformes :
```json
{ "error": { "code": "invalid_credentials", "message": "Email ou mot de passe incorrect" } }
```
Jamais de stack trace, de message Postgres brut, ni de détail interne renvoyé au client.

### 6. Tests

Aucun test runner configuré dans awac actuellement — Vitest à ajouter.
- **Unitaires** : hash/vérification bcrypt, signature/vérification JWT, calcul du score combiné (normalisation vote/jury).
- **Intégration** : endpoints critiques (`/auth/login`, `/votes`, `/evaluations`) contre une branche Neon dédiée aux tests (branching natif Neon).

## Hors scope (explicitement exclu de cette migration/version)

- Intégration Mobile Money réelle — reste simulée.
- Toute modification du site vitrine (design, contenu, composants existants).
- Refresh token / rotation de session avancée.
- Catégories Homme/Femme, éditions multiples, assignation jury→candidat, modération de photos (voir "Portée volontairement exclue" ci-dessus).

## Risques identifiés

- **Limite CPU Workers (10ms/requête, plan gratuit)** : à surveiller sur `/dashboard` (agrégats). Mitigation : requêtes SQL agrégées côté Neon plutôt que calcul en mémoire dans le Worker, éventuellement mise en cache courte.
- **Limite 100k requêtes/jour** : filet de sécurité pas cher si dépassé (plan payant Workers = 5$/mois pour 10M requêtes).
- **JWT sans refresh** : reconnexion après 7 jours d'inactivité — acceptable pour ce cas d'usage.
- **Pondération vote/jury modifiable à tout moment par l'admin** : si changée pendant que le concours est encore ouvert, le classement affiché change rétroactivement pour tout le monde — comportement voulu (l'admin garde la main), mais à documenter clairement dans l'UI admin pour éviter la confusion.
