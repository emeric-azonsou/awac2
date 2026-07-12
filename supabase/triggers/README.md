# Supabase Triggers

Ce dossier contient les triggers PostgreSQL automatisés pour maintenir la cohérence des données et automatiser les flux métier.

## Structure

```
triggers/
  - 001_audit_triggers.sql
  - 002_timestamp_triggers.sql
  - 003_score_validation_triggers.sql
  - 004_certificate_triggers.sql
  - 005_notification_triggers.sql
  - 006_cache_invalidation_triggers.sql
```

## Types de Triggers

### 1. Audit Triggers
Enregistre automatiquement chaque modification importante:
```sql
AFTER INSERT/UPDATE/DELETE ON [table]
  -> INSERT INTO audit_logs (...)
```

**Tables auditées**:
- candidate_scores (notation)
- certificates (génération/signature)
- candidate_assignments (assignation)
- public_votes (votes)
- system_settings (configuration)

### 2. Timestamp Triggers
Met à jour automatiquement `updated_at`:
```sql
BEFORE UPDATE ON [table]
  -> SET updated_at = now()
```

**Appliqué à**:
- competitions
- candidates
- jury_groups
- forms
- et toutes les autres

### 3. Score Validation Triggers
Valide les scores avant insertion:
```sql
BEFORE INSERT ON candidate_scores
  -> Vérifier min/max du critère
  -> Vérifier la jury_group existe
  -> Vérifier l'étape est active
```

### 4. Certificate Triggers
Gère les certificats:
```sql
AFTER INSERT ON certificates
  -> Générer certificate_number unique
  -> Log dans audit_logs

AFTER INSERT ON signatures
  -> Vérifier toutes les signatures
  -> Changer status = 'signed'
  -> Bloquer les modifications
```

### 5. Notification Triggers
Envoie les notifications automatiquement:
```sql
AFTER UPDATE ON competition_results
  WHERE status = 'published'
  -> INSERT INTO notifications (...)

AFTER INSERT ON candidate_scores
  WHERE jury_group_id = X
  -> Notifier le président du groupe
```

### 6. Cache Invalidation Triggers
Invalide le cache du dashboard:
```sql
AFTER UPDATE ON competition_results
  -> DELETE FROM dashboard_cache
     WHERE competition_id = X
     AND cache_key LIKE '%results%'
```

## Fonction Helper pour Audit

```sql
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    changes,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'before', row_to_json(OLD),
      'after', row_to_json(NEW)
    ),
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## Exemple complet de Trigger

```sql
-- Trigger: Auto-update timestamps
CREATE TRIGGER candidates_updated_at_trigger
BEFORE UPDATE ON candidates
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Trigger: Audit changes
CREATE TRIGGER candidates_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON candidates
FOR EACH ROW
EXECUTE FUNCTION audit_changes();

-- Trigger: Validation de score
CREATE TRIGGER score_validation_trigger
BEFORE INSERT OR UPDATE ON candidate_scores
FOR EACH ROW
EXECUTE FUNCTION validate_score();
```

## Performance

⚠️ Les triggers ralentissent les opérations:
- Minimiser la logique complexe dans les triggers
- Utiliser des indexes appropriés
- Monitorer les performances

✅ Best practices:
- Un trigger = une responsabilité
- Utiliser des fonctions réutilisables
- Documenter la logique complexe
- Ajouter des guards (IF EXISTS, etc.)

## Debugging

Vérifier les triggers activés:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table;
```

Simuler un trigger (test):
```sql
-- Insérer sans trigger
ALTER TABLE candidates DISABLE TRIGGER ALL;
INSERT INTO candidates (...) VALUES (...);
ALTER TABLE candidates ENABLE TRIGGER ALL;
```

## Ordre d'exécution critique

1. BEFORE TRIGGER (validation)
2. Opération (INSERT/UPDATE/DELETE)
3. AFTER TRIGGER (audit, notification)

**Important**: Les BEFORE triggers peuvent modifier les données.
