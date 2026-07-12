# Supabase Migrations

Ce dossier contient toutes les migrations SQL pour initialiser et gérer le schéma de base de données PostgreSQL de la plateforme AWAC MONO.

## Structure des fichiers

Les fichiers de migration suivent la convention de nommage :
```
NNN_description_en_snake_case.sql
```

Exemples:
- `001_init_schema.sql` - Création du schéma initial
- `002_add_rls_policies.sql` - Ajout des politiques Row Level Security
- `003_create_views.sql` - Création des vues utiles
- `004_add_functions.sql` - Création des fonctions PostgreSQL
- `005_add_indexes.sql` - Ajout des index de performance

## Exécution des migrations

### Avec Supabase CLI
```bash
supabase migration up
```

### Manuellement dans Supabase Dashboard
1. Aller dans SQL Editor
2. Créer une nouvelle query
3. Copier le contenu du fichier migration
4. Exécuter

## Conventions

### Nommage
- Tables: snake_case, pluriel (ex: `candidates`, `jury_groups`)
- Colonnes: snake_case, singulier (ex: `candidate_id`, `full_name`)
- Clés primaires: toujours `id` (uuid)
- Clés étrangères: `{table}_id`
- Timestamps: `created_at`, `updated_at`
- Booléens: `is_{property}` (ex: `is_active`, `is_verified`)

### Types énumérés
Créer les types ENUM au début de la première migration:
```sql
CREATE TYPE candidate_status AS ENUM ('registered', 'approved', 'rejected', 'withdrawn');
```

### Indexes
Créer un index pour:
- Chaque clé étrangère
- Chaque colonne fréquemment utilisée en WHERE
- Chaque colonne utilisée en ORDER BY

## Row Level Security (RLS)

**Toutes les tables doivent avoir RLS activé.**

Voir `../policies/` pour les politiques RLS détaillées.

## Gestion des dépendances

Les migrations doivent être idempotentes quand possible:
```sql
CREATE TABLE IF NOT EXISTS ...
```

Mais attention aux migrations destructrices (DROP) - celles-ci ne sont jamais idempotentes.

## Bonnes pratiques

✅ DO:
- Tester chaque migration localement d'abord
- Inclure des comments explicatifs
- Utiliser les transactions
- Ajouter des contraintes (CHECK, UNIQUE, NOT NULL)

❌ DON'T:
- Modifier le schéma en production sans backup
- Mettre des données de seed dans les migrations (utiliser `seed/`)
- Créer des tables sans RLS
- Oublier les indexes sur FK
