# Supabase Seed Data

Ce dossier contient les scripts pour peupler la base de données avec des données de démonstration et de test.

## Structure

```
seed/
  - 001_seed_competitions.ts
  - 002_seed_profiles.ts
  - 003_seed_jury_groups.ts
  - 004_seed_candidates.ts
  - 005_seed_steps_and_forms.ts
  - 006_seed_assignments.ts
  - reset.ts
```

## Exécution

### Seed complet
```bash
supabase seed run
```

### Seed spécifique
```bash
supabase seed run -- --file 001_seed_competitions.ts
```

### Reset et reseed
```bash
# Reset la base locale
supabase db reset

# Automatiquement reseed après reset
```

## Données de seed

### 1. Competitions (001_seed_competitions.ts)
Crée 2 compétitions:
- **AWAC MONO 2024** (en cours)
- **AWAC MONO 2023** (fermée)

```typescript
{
  name: 'AWAC MONO 2024',
  status: 'in_progress',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31'),
  max_candidates: 50
}
```

### 2. Profiles (002_seed_profiles.ts)
Crée 15 utilisateurs de test:

| Email | Rôle | Password |
|-------|------|----------|
| admin@awac.local | administrator | password123 |
| moderator@awac.local | moderator | password123 |
| president1@awac.local | jury_president | password123 |
| president2@awac.local | jury_president | password123 |
| jury1-1@awac.local | jury_member | password123 |
| jury1-2@awac.local | jury_member | password123 |
| jury2-1@awac.local | jury_member | password123 |
| jury2-2@awac.local | jury_member | password123 |
| ... | ... | ... |

### 3. Jury Groups (003_seed_jury_groups.ts)
Crée 2 groupes par compétition:
- **Groupe 1** (Président: president1)
- **Groupe 2** (Président: president2)

Chaque groupe a 3-4 membres.

### 4. Candidates (004_seed_candidates.ts)
Crée 30 candidats:
- 15 hommes, 15 femmes
- 3 catégories: Couture, Broderie, Accessoires
- Statut: approved

```typescript
{
  first_name: 'Aminata',
  last_name: 'Diallo',
  gender: 'female',
  category: 'Couture',
  workshop_name: 'Atelier Diallo Couture',
  commune: 'Kinshasa'
}
```

### 5. Steps & Forms (005_seed_steps_and_forms.ts)
Crée 3 étapes de notation:

1. **Sélection (40%)**
   - Critères: Présentation (20), Technique (20), Originalité (20)

2. **Semi-Finale (35%)**
   - Critères: Qualité (25), Innovation (25), Conformité (25)

3. **Finale (25%)**
   - Critères: Performance (25), Jury Vote (25), Public Vote (25)

Chaque étape a un formulaire avec 5 champs:
- Note numérique 0-100
- Curseur 0-10
- Commentaire
- Suggestion
- Case à cocher

### 6. Assignments (006_seed_assignments.ts)
Assigne les candidats aux jurys:
- Chaque candidat assigné à chaque étape
- Distribué entre les 2 groupes
- Ordre de passage assigné

## Données de test réalistes

Les données seed incluent:
- ✅ Candidats diversifiés (genres, régions, catégories)
- ✅ Scores variés (90-100, 70-85, 50-70)
- ✅ Quelques notes validées
- ✅ Commentaires et suggestions réalistes
- ✅ Votes publics simulés
- ✅ Certificats exemple (brouillon)

## Scenarios de test

### Scenario 1: Notation complète
1. Jury membre note un candidat
2. Jury président valide
3. Résultats calculés
4. Certificats générés

### Scenario 2: Clôture d'étape
1. Tous les candidats notés
2. Président clôt l'étape
3. Calculs de classement
4. Notifications envoyées

### Scenario 3: Compétition fermée
1. Compétition 2023 est fermée
2. Certificats signés
3. Résultats publiés
4. Rapports disponibles

## Utilitaires de seed

### Reset complet
```bash
supabase db reset
```

### Supprimer les données de test
```typescript
// Dans reset.ts
DELETE FROM audit_logs;
DELETE FROM candidates;
DELETE FROM profiles;
// ... etc
```

### Réimporter des données
```bash
supabase seed run --file 001_seed_competitions.ts
supabase seed run --file 002_seed_profiles.ts
```

## Bonnes pratiques

✅ DO:
- Utiliser des emails distincts avec `.local`
- Inclure du contenu réaliste
- Créer plusieurs scenarios
- Documenter chaque seed
- Utiliser des transactionsSQL

❌ DON'T:
- Laisser des données hardcodées dans le code
- Utiliser les vraies données de production
- Oublier de reset avant un nouveau build
- Inclure des données sensibles

## Intégration CI/CD

```yaml
# .github/workflows/test.yml
- name: Seed database
  run: supabase seed run
  
- name: Run tests
  run: npm test
```
