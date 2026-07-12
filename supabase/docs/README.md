# Supabase Documentation

Ce dossier centralise la documentation du backend Supabase pour la plateforme AWAC MONO.

## Documentation par domaine

### Architecture Globale
- `architecture.md` - Vue d'ensemble du système
- `data-flow.md` - Flux de données
- `security-model.md` - Modèle de sécurité complet

### API Endpoints
- `api-endpoints.md` - REST API documentée
- `api-examples.md` - Exemples d'utilisation
- `api-errors.md` - Gestion des erreurs

### Authentification
- `auth-setup.md` - Configuration Supabase Auth
- `auth-roles.md` - Système de rôles et permissions
- `auth-jwt.md` - JWT tokens et claims

### Données
- `schema.md` - Schéma de base de données simplifié
- `data-validation.md` - Règles de validation
- `data-consistency.md` - Cohérence des données

### Sécurité
- `security-policies.md` - Row Level Security détaillé
- `audit-logging.md` - Système d'audit
- `encryption.md` - Stratégie de chiffrement

### Opérations
- `deployment.md` - Déploiement en production
- `monitoring.md` - Monitoring et alertes
- `backup-recovery.md` - Sauvegarde et récupération
- `scaling.md` - Stratégie de scalabilité

### Performance
- `query-optimization.md` - Optimisation des requêtes
- `caching-strategy.md` - Stratégie de cache
- `indexing.md` - Stratégie d'indexing

## Ressources essentielles

### Liens de référence
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RLS Patterns](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Guide](https://supabase.com/docs/guides/local-development)

### Outils
- Supabase Dashboard: `https://app.supabase.com/`
- Local Supabase: `supabase start`
- SQL Editor: Integrated in dashboard
- Postman Collection: `docs/postman-collection.json`

## Guide de démarrage

### 1. Setup local
```bash
npm install
supabase start
```

### 2. Consulter le schéma
```bash
# Voir le fichier ERD
open supabase/erd/awac_erd.md
```

### 3. Explorer les données
```bash
# Dashboard SQL Editor
supabase start
# -> Navigate to http://localhost:54323
```

### 4. Tester l'API
```bash
# Utiliser Postman ou curl
curl 'http://localhost:54321/rest/v1/candidates' \
  -H 'Authorization: Bearer YOUR_JWT'
```

## Communication avec le Frontend

Le frontend (Vue 3) communique via:

1. **Supabase JS Client**
```typescript
import { supabase } from '@/supabase.js'

// Query
const { data, error } = await supabase
  .from('candidates')
  .select('*')
  .eq('competition_id', id)

// Subscribe
supabase
  .from('candidate_scores')
  .on('*', payload => { ... })
  .subscribe()
```

2. **REST API** (pour requêtes complex)
```bash
curl 'http://localhost:54321/rest/v1/candidates?competition_id=eq.xxx'
```

3. **Edge Functions** (logique serveur)
```typescript
const { data } = await supabase.functions.invoke('vote-processor', {
  body: { candidateId: 'xxx' }
})
```

## Checklist de sécurité

- [ ] Tous les endpoints avec authentification
- [ ] RLS activé sur toutes les tables
- [ ] Policies testées avec différents rôles
- [ ] Audit logging fonctionnel
- [ ] Secrets pas commités
- [ ] CORS configuré correctement
- [ ] Rate limiting en place
- [ ] Logs centralisés

## FAQ

**Q: Comment tester les policies RLS ?**
A: Voir `docs/security-policies.md` → Testing section

**Q: Où sont les migrations ?**
A: Dans `supabase/migrations/`

**Q: Comment deployer en production ?**
A: Voir `docs/deployment.md`

**Q: Que faire si les données sont inconsistentes ?**
A: Voir `docs/data-consistency.md` → Recovery

## Support

Pour problèmes:
1. Vérifier les logs: `supabase logs`
2. Consulter la doc pertinente: `docs/`
3. Ouvrir une issue GitHub
4. Contacter l'admin Supabase
