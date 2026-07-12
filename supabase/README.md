# Supabase Infrastructure - AWAC MONO

Documentation centralisée pour l'infrastructure backend Supabase.

## 📁 Structure des dossiers

```
supabase/
├── erd/                    # Modèle de données (ERD)
│   ├── README.md          # Guide du schéma
│   └── awac_erd.md        # Diagramme Mermaid complet
│
├── migrations/            # Migrations SQL PostgreSQL
│   ├── README.md          # Guide des migrations
│   ├── 001_init_schema.sql
│   ├── 002_rls_policies.sql
│   └── ...
│
├── policies/              # Row Level Security (RLS)
│   ├── README.md          # Guide des politiques
│   ├── 001_profiles_policies.sql
│   └── ...
│
├── triggers/              # Triggers PostgreSQL
│   ├── README.md          # Guide des triggers
│   ├── 001_audit_triggers.sql
│   └── ...
│
├── functions/             # PostgreSQL Functions & Edge Functions
│   ├── README.md          # Guide des functions
│   └── sql/
│       └── *.sql
│
├── storage/               # Configuration des buckets Storage
│   └── README.md          # Guide du storage
│
├── seed/                  # Données de seed (dev/test)
│   ├── README.md          # Guide du seeding
│   └── *.ts              # Scripts de seed
│
├── docs/                  # Documentation générale
│   ├── README.md          # Index principal
│   ├── architecture.md    # (À créer)
│   ├── security-model.md  # (À créer)
│   ├── api-endpoints.md   # (À créer)
│   └── ...
│
├── config.toml            # Configuration Supabase (ce fichier)
└── README.md              # (Ce fichier)
```

## 🚀 Démarrage rapide

### Installation locale
```bash
# Installer Supabase CLI
npm install -g @supabase/cli

# Initialiser le projet (déjà fait)
supabase init

# Démarrer localement
supabase start

# Arrêter localement
supabase stop
```

### Première utilisation
```bash
# 1. Consulter le schéma
cat supabase/erd/awac_erd.md

# 2. Vérifier les migrations existantes
ls supabase/migrations/

# 3. Voir la documentation
cat supabase/docs/README.md

# 4. Accéder au dashboard
# Local: http://localhost:54323
# Production: https://app.supabase.com/
```

## 📚 Documentation par dossier

| Dossier | Contenu | Guide |
|---------|---------|-------|
| `erd/` | Modèle relationnel complet | `erd/README.md` |
| `migrations/` | Schéma SQL | `migrations/README.md` |
| `policies/` | Row Level Security | `policies/README.md` |
| `triggers/` | Automatisation logique métier | `triggers/README.md` |
| `functions/` | Fonctions métier | `functions/README.md` |
| `storage/` | Gestion fichiers | `storage/README.md` |
| `seed/` | Données test/démo | `seed/README.md` |
| `docs/` | Documentation générale | `docs/README.md` |

## 🔐 Sécurité

**Priorités absolues**:
1. ✅ Row Level Security (RLS) activé sur TOUTES les tables
2. ✅ Audit logging de toutes les actions sensibles
3. ✅ Secrets **JAMAIS** commitées
4. ✅ Vérification du rôle avant chaque opération
5. ✅ Scores validés = immuables
6. ✅ Certificats signés = immuables

Voir `policies/README.md` pour détails.

## 📊 Architecture

### Couches
```
Frontend (Vue 3)
    ↓
Supabase Client JS
    ↓
Supabase API (REST, Realtime)
    ↓
PostgreSQL Database
    ↓
Row Level Security (RLS)
```

### Flux de données
1. **Requête** → Frontend envoie via Supabase Client
2. **Auth** → Supabase vérifie JWT token
3. **RLS** → PostgreSQL applique les policies
4. **Query** → Données filtrées retournées au frontend

## 🔄 Workflow de développement

### Modifier le schéma
1. Consulter `erd/awac_erd.md` pour structure
2. Créer nouvelle migration: `migrations/NNN_description.sql`
3. Exécuter: `supabase migration up`
4. Tester localement
5. Commit et push

### Ajouter une RLS policy
1. Voir `policies/README.md` pour template
2. Créer/éditer dans `policies/NNN_table_policies.sql`
3. Appliquer: `supabase migration up` ou import SQL
4. Tester avec différents rôles

### Créer une function
1. Voir `functions/README.md` pour guide
2. Créer dans `functions/` (SQL ou Deno)
3. Déployer: `supabase functions deploy function_name`
4. Tester: `supabase functions test function_name`

### Ajouter données de seed
1. Voir `seed/README.md` pour structure
2. Créer script dans `seed/`
3. Exécuter: `supabase seed run`

## 🧪 Testing

### Tester RLS policies
```bash
# Dans Supabase Dashboard: SQL Editor
# Activer "Impersonating User"
# Sélectionner un utilisateur avec rôle spécifique
# Exécuter requête
```

### Tester Edge Functions
```bash
supabase functions serve
# Dans autre terminal
supabase functions test function_name
```

### Tester migrations
```bash
supabase migration up
supabase migration down
```

## 🚢 Déploiement

### Local → Production
```bash
# 1. Vérifier config
cat config.toml

# 2. Créer migration
supabase migration new name_of_migration

# 3. Appliquer localement
supabase migration up

# 4. Tester complètement
npm test

# 5. Déployer en production
supabase db push

# 6. Vérifier en production
# Aller sur: https://app.supabase.com/[project]/sql
```

## 📝 Configuration

Le fichier `config.toml` contient:
- ✅ Identifiants du projet
- ✅ Extensions PostgreSQL
- ✅ Configuration Auth (JWT, providers)
- ✅ Configuration Storage (buckets)
- ✅ Configuration Realtime
- ✅ Logging et monitoring

**À personnaliser pour production**:
- [ ] JWT secret (random strong)
- [ ] CORS origins
- [ ] Email SMTP
- [ ] Backup retention
- [ ] Rate limits

## 🔍 Monitoring

### Logs locaux
```bash
supabase logs
```

### Dashboard production
- Aller sur: https://app.supabase.com/[project]/logs
- Voir Real-time, API, Database, Auth logs

### Audit logs
```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;
```

## 🆘 Troubleshooting

| Problème | Solution |
|----------|----------|
| RLS policies rejettent mes requêtes | Vérifier rôle utilisateur + policies appliquées |
| Migrations échouent | Vérifier dépendances (FK, types ENUM) |
| Performances lentes | Vérifier indexes, voir `docs/query-optimization.md` |
| Données inconsistentes | Voir `docs/data-consistency.md` |

## 📞 Support

- 📖 Docs: `supabase/docs/README.md`
- 💬 GitHub: Supabase discussions
- 🐛 Issues: Créer sur GitHub

## ✅ Checklist avant production

- [ ] Tous les secrets configurés
- [ ] RLS testé avec tous les rôles
- [ ] Migrations appliquées
- [ ] Audit logging fonctionnel
- [ ] Backups configurés
- [ ] Rate limits en place
- [ ] CORS configuré
- [ ] Tests passent
- [ ] Documentation à jour
- [ ] Plan de rollback défini

---

**Dernière mise à jour**: 2 juillet 2026  
**Version**: 1.0 (Initial Release)
