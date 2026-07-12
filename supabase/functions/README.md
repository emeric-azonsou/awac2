# Supabase Functions

Ce dossier contient les fonctions PostgreSQL et les Edge Functions (TypeScript/JavaScript) pour la plateforme AWAC MONO.

## Structure

### SQL Functions
Fonctions PostgreSQL exécutées côté serveur dans les triggers ou appelées via API:
```
functions/sql/
  - calculate_final_scores.sql
  - close_step_for_group.sql
  - validate_score.sql
  - generate_certificate_number.sql
  - etc.
```

### Edge Functions (Deno)
Fonctions serverless pour logique métier complexe:
```
functions/
  - auth-webhook/
  - vote-processor/
  - certificate-generator/
  - notification-sender/
  - etc.
```

## Exécution

### Déploiement des Edge Functions
```bash
supabase functions deploy auth-webhook
```

### Appel d'une Edge Function
```typescript
const { data, error } = await supabase.functions.invoke('vote-processor', {
  body: { candidateId: 'xxx', amount: 1000 }
})
```

### Exécution d'une SQL Function
```sql
SELECT calculate_final_scores('competition_id_value');
```

## Sécurité

- ✅ Vérifier l'authentification dans les Edge Functions
- ✅ Valider toutes les entrées
- ✅ Utiliser les JWT pour l'authentification
- ✅ Logger toutes les opérations sensibles
- ❌ Ne jamais exposer les secrets
- ❌ Ne jamais modifier directement les données sans auditer

## Exemples

### SQL Function Simple
```sql
CREATE OR REPLACE FUNCTION close_step_for_group(
  step_id uuid,
  group_id uuid
)
RETURNS void AS $$
BEGIN
  UPDATE steps SET status = 'closed' WHERE id = step_id;
  INSERT INTO step_closures (step_id, group_id, closed_at)
  VALUES (step_id, group_id, now());
END;
$$ LANGUAGE plpgsql;
```

### Edge Function Basique
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Vérifier l'auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Traiter la requête
  const data = await req.json()
  
  return new Response(
    JSON.stringify({ success: true, data }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

## Maintenance

- Tester les functions localement avec `supabase start`
- Documenter les paramètres et valeurs de retour
- Versionner les Edge Functions
- Archiver les functions obsolètes avec un préfixe `deprecated_`
