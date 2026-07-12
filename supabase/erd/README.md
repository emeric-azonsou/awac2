# Supabase ERD (Entity Relationship Diagram)

Ce dossier contient le modèle de données relationnel complet pour la plateforme AWAC MONO.

## Fichiers

### awac_erd.md
Diagramme Mermaid complet avec toutes les entités et leurs relations:
- 32 tables principales
- Toutes les relations visualisées
- Spécifications détaillées par entité
- Conventions de nommage
- Considérations de sécurité

**Comment utiliser**:
1. Ouvrir sur GitHub → affichage automatique du diagramme
2. Copier le contenu Mermaid dans [mermaid.live](https://mermaid.live)
3. Imprimer le diagramme avec "Print Diagram" de Mermaid

### Modèle relationnel

Le modèle est organisé en 6 domaines métier:

#### 1. Compétitions & Paramètres
- `competitions` - Concours principaux
- `steps` - Étapes de notation
- `system_settings` - Paramètres globaux
- `competition_status_logs` - Historique du statut

#### 2. Gestion des Candidats
- `candidates` - Candidats du concours
- `candidate_photos` - Leurs photos
- `candidate_assignments` - Assignations aux jurys

#### 3. Notation & Évaluation
- `criteria` - Critères de notation
- `forms` - Formulaires dynamiques
- `form_fields` - Champs du formulaire
- `field_options` - Options des champs
- `form_responses` - Réponses aux formulaires
- `form_response_values` - Valeurs individuelles
- `candidate_scores` - Notes des candidats
- `candidate_comments` - Commentaires
- `candidate_suggestions` - Suggestions

#### 4. Jury & Groupes
- `profiles` - Utilisateurs du système
- `jury_groups` - Groupes de jurys
- `jury_group_members` - Membres des groupes
- `jury_group_steps` - Assignations étapes-groupes

#### 5. Résultats & Certificats
- `public_votes` - Votes du public
- `competition_results` - Résultats finaux
- `special_awards` - Prix spéciaux
- `certificate_types` - Types de certificats
- `certificate_templates` - Templates HTML
- `certificates` - Certificats générés
- `signatures` - Signatures numériques
- `official_stamps` - Tampons officiels

#### 6. Infrastructure & Sécurité
- `profiles` - Authentification utilisateurs
- `notifications` - Notifications système
- `audit_logs` - Logs d'audit complets
- `dashboard_cache` - Cache du dashboard
- `step_closures` - Clôtures de group/étape

## Stratégie de migration

Le schéma doit être créé **progressivement** dans cet ordre:

1. **Phase 1**: Infrastructure de base
   - Profiles, Competitions, Steps, Criteria
   - Migrations: `001_init_schema.sql`

2. **Phase 2**: Candidats et Jury
   - Candidates, Jury Groups, Assignments
   - Migrations: `002_candidates_jury.sql`

3. **Phase 3**: Notation et Formulaires
   - Forms, Scoring, Comments
   - Migrations: `003_scoring.sql`

4. **Phase 4**: Sécurité
   - RLS Policies
   - Migrations: `004_rls_policies.sql`

5. **Phase 5**: Résultats et Certificats
   - Results, Certificates, Signatures
   - Migrations: `005_results_certificates.sql`

6. **Phase 6**: Audit et cache
   - Triggers, Audit Logs, Cache
   - Migrations: `006_audit_triggers.sql`

## Visualisation

### Graphique de dépendances entre tables

```
competitors
    ↓
candidates ← → candidate_assignments
    ↓                ↓
candidate_photos   jury_groups
    ↓                ↓
candidate_scores   jury_group_members
    ↓
candidate_comments
    ↓
candidate_suggestions
    ↓
competition_results
    ↓
certificates
    ↓
signatures
```

## Validation du schéma

Après création, valider:

```sql
-- Vérifier toutes les tables existent
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Vérifier les indexes
SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public';

-- Vérifier les RLS policies
SELECT * FROM pg_policies;

-- Tester un exemple
SELECT COUNT(*) FROM candidates;
```

## Versioning

- **v1.0**: Schéma initial avec 32 tables
- **v1.1**: Ajouts form_responses, step_closures
- **v1.2**: Améliorations RLS et audit

Voir les migrations SQL pour l'historique complet.

## Documentation additionelle

- Voir `../migrations/` pour implémentation SQL
- Voir `../policies/` pour règles d'accès
- Voir `../triggers/` pour logique métier
- Voir `../functions/` pour fonctions spécialisées
