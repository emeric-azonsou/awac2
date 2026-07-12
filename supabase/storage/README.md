# Supabase Storage

Ce dossier configure et documente le système de stockage de fichiers pour AWAC MONO sur Supabase.

## Buckets

Créer les buckets suivants dans Supabase Dashboard:

### 1. candidates-photos
**Contenu**: Photos de profil et de création des candidats
- Formats: JPG, PNG, WebP
- Taille max: 5MB par photo
- Public: Non (private)
- Versioning: Oui

**Chemin d'accès**:
```
candidates-photos/
  {competition_id}/
    {candidate_id}/
      profile.jpg
      creation.jpg
```

### 2. competition-documents
**Contenu**: Règlements, documents officiels, formulaires
- Formats: PDF, DOC, DOCX
- Taille max: 10MB
- Public: Oui (pour lecture des règlements)
- Versioning: Non

**Chemin d'accès**:
```
competition-documents/
  {competition_id}/
    rules.pdf
    form_template.docx
```

### 3. certificates
**Contenu**: Fichiers PDF des certificats
- Formats: PDF
- Taille max: 2MB
- Public: Non (privé, accès via signed URL)
- Versioning: Oui

**Chemin d'accès**:
```
certificates/
  {competition_id}/
    {certificate_number}.pdf
```

### 4. templates
**Contenu**: Templates HTML/images pour certificats
- Formats: PNG, SVG, HTML
- Public: Oui (templates de design)
- Versioning: Oui

**Chemin d'accès**:
```
templates/
  certificates/
    {certificate_type}/
      template.html
      seal.png
      signature_placeholder.png
  logos/
    {competition_id}_logo.png
```

### 5. audit-exports
**Contenu**: Exports des logs d'audit, rapports
- Formats: CSV, JSON, PDF
- Public: Non (admin only)
- Versioning: Oui

**Chemin d'accès**:
```
audit-exports/
  {competition_id}/
    {year}-{month}-audit-log.csv
    {year}-{month}-results.json
```

## Politiques d'accès Storage

Voir `../policies/storage.sql` pour les politiques RLS du storage.

### Rules par bucket:

**candidates-photos**:
- Lecture: Modérateurs du concours, propriétaire
- Écriture: Candidat, Modérateur

**competition-documents**:
- Lecture: Publique
- Écriture: Admin, Modérateur

**certificates**:
- Lecture: Propriétaire (candidat), Admin
- Écriture: Admin (génération automatique)
- Suppression: Admin uniquement

**templates**:
- Lecture: Publique (cached dans le frontend)
- Écriture: Admin uniquement

**audit-exports**:
- Lecture: Admin uniquement
- Écriture: Système (triggers automatiques)
- Suppression: Admin

## Usage côté Frontend

### Upload de fichier
```typescript
import { supabase } from '@/supabase.js'

const file = /* File object */
const { data, error } = await supabase.storage
  .from('candidates-photos')
  .upload(`${competitionId}/${candidateId}/profile.jpg`, file, {
    cacheControl: '3600',
    upsert: true
  })
```

### Accès aux fichiers

**Public**:
```typescript
const url = supabase.storage
  .from('competition-documents')
  .getPublicUrl(`${competitionId}/rules.pdf`).data.publicUrl
```

**Privé (Signed URL - expire après 1 heure)**:
```typescript
const { data } = await supabase.storage
  .from('certificates')
  .createSignedUrl(`${competitionId}/${certNumber}.pdf`, 3600)

const url = data.signedUrl
```

### Téléchargement
```typescript
const { data, error } = await supabase.storage
  .from('audit-exports')
  .download(`${competitionId}/${filename}`)

// Créer un blob et télécharger
const blob = new Blob([data], { type: 'text/csv' })
const url = window.URL.createObjectURL(blob)
window.open(url)
```

## Quotas et Limitations

- **Storage par projet**: À définir selon le plan Supabase
- **Upload max**: 10GB par fichier
- **Bande passante**: À définir selon le plan

## Maintenance

### Nettoyer les anciens fichiers
```bash
# Supprimer les fichiers de plus de 90 jours
supabase storage clean
```

### Monitorer l'utilisation
```sql
SELECT 
  bucket_id,
  SUM(bytes_used) as total_bytes,
  COUNT(*) as file_count
FROM storage.objects
GROUP BY bucket_id;
```

## Sécurité

✅ DO:
- Vérifier les MIME types à l'upload
- Limiter les tailles de fichiers
- Utiliser des Signed URLs pour fichiers privés
- Auditer tous les uploads/downloads
- Chiffrer les fichiers sensibles

❌ DON'T:
- Stocker les secrets dans les fichiers
- Permettre les uploads sans authentification
- Laisser les fichiers publics par défaut
- Oublier de nettoyer les fichiers obsolètes
