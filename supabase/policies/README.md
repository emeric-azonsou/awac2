# Supabase Row Level Security (RLS) Policies

Ce dossier contient toutes les politiques Row Level Security (RLS) pour protéger les données de la plateforme AWAC MONO.

## Structure

```
policies/
  - 001_profiles_policies.sql
  - 002_competitions_policies.sql
  - 003_candidates_policies.sql
  - 004_jury_policies.sql
  - 005_scores_policies.sql
  - 006_certificates_policies.sql
  - 007_audit_policies.sql
  - 008_public_access.sql
```

## Principes de sécurité

### Rôles (user_role)
- **administrator**: Accès total
- **moderator**: Gestion des candidats et étapes
- **jury_president**: Gestion du groupe, notation, clôture d'étape
- **jury_member**: Notation uniquement

### Règles d'accès strict

#### Profiles
- Les utilisateurs ne voient que leur propre profil
- Les admin voient tous les profils
- Les modérateurs voient les jury et admin

#### Candidates
- Visibility: selon le rôle
- Admin/Moderator: voir tous
- Jury: voir les candidats assignés
- Readonly pour les jury_members

#### Scores
- Les jury_members ne peuvent **JAMAIS** modifier un score validé
- Seuls les validateurs peuvent valider les scores
- Les modérateurs voient tous les scores
- Les jury ne voient que leurs propres scores

#### Certificates
- Modérateurs/Admin: création et signature
- Une fois signée, une certification est **immuable**
- Les signatures ne peuvent pas être modifiées après création

#### Audit Logs
- Inaccessibles aux jury members
- Les modérateurs voient les logs de leurs actions
- Les admins voient tous les logs

### Votes publics
- Immutables une fois enregistrés
- Vérification automatique des transactions
- Les fraudeurs peuvent être marqués comme `is_verified = false`

## Template de Politique

```sql
-- Lecture
CREATE POLICY "policy_name_read"
ON table_name FOR SELECT
USING (
  auth.uid() = created_by
  OR auth.jwt() ->> 'role' = 'administrator'
);

-- Insertion
CREATE POLICY "policy_name_insert"
ON table_name FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (auth.jwt() ->> 'role' IN ('administrator', 'moderator'))
);

-- Mise à jour
CREATE POLICY "policy_name_update"
ON table_name FOR UPDATE
USING (...)
WITH CHECK (...);

-- Suppression
CREATE POLICY "policy_name_delete"
ON table_name FOR DELETE
USING (...);
```

## Points critiques

⚠️ **Jamais autoriser**:
- Les jury_members à modifier les scores validés
- Les utilisateurs à modifier leur propre rôle
- L'accès aux signatures officielles par les jury
- La modification des certificats après signature

✅ **Toujours implémenter**:
- Audit logging de toutes les modifications sensibles
- Vérification du rôle avant chaque opération
- Vérification du propriétaire pour les données personnelles
- Immuabilité des données critiques

## Test des politiques

Tester localement:
```bash
# Démarrer Supabase
supabase start

# Connecter avec différents rôles
supabase test
```

Utiliser l'IDE de test de Supabase:
1. Aller dans SQL Editor
2. Activer "Impersonating User"
3. Sélectionner un utilisateur avec un rôle spécifique
4. Exécuter les requêtes

## Audit

Toute tentative d'accès refusée est enregistrée si les triggers sont configurés.

Vérifier dans `audit_logs`:
```sql
SELECT * FROM audit_logs 
WHERE action = 'DENIED' 
ORDER BY created_at DESC;
```
