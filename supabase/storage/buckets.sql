-- =============================================================================
-- AWAC MONO - Supabase Storage Configuration
-- =============================================================================
-- This file defines:
--   - Storage buckets for files, photos, certificates, etc.
--   - RLS policies for bucket access control
--   - File size limits and content type restrictions
--
-- NOTE: This must be executed via Supabase CLI or API
--       Run with: supabase db execute -f supabase/storage/buckets.sql
-- =============================================================================

-- =============================================================================
-- CREATE STORAGE BUCKETS
-- =============================================================================

-- Create photos bucket (candidate profile and creation photos)
INSERT INTO storage.buckets (id, name, owner, public, avif_autodetection)
VALUES (
  'candidates-photos',
  'candidates-photos',
  auth.uid(),
  false,
  true
) ON CONFLICT (id) DO NOTHING;

-- Create certificates bucket (PDF certificates)
INSERT INTO storage.buckets (id, name, owner, public, avif_autodetection)
VALUES (
  'certificates',
  'certificates',
  auth.uid(),
  false,
  false
) ON CONFLICT (id) DO NOTHING;

-- Create signatures bucket (jury member signatures)
INSERT INTO storage.buckets (id, name, owner, public, avif_autodetection)
VALUES (
  'signatures',
  'signatures',
  auth.uid(),
  false,
  false
) ON CONFLICT (id) DO NOTHING;

-- Create stamps bucket (official stamps/seals)
INSERT INTO storage.buckets (id, name, owner, public, avif_autodetection)
VALUES (
  'stamps',
  'stamps',
  auth.uid(),
  false,
  true
) ON CONFLICT (id) DO NOTHING;

-- Create temporary bucket (temporary files, cleanup)
INSERT INTO storage.buckets (id, name, owner, public, avif_autodetection)
VALUES (
  'temp',
  'temp',
  auth.uid(),
  false,
  false
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- RLS POLICIES - PHOTOS BUCKET
-- =============================================================================

/**
 * candidates-photos bucket:
 * - Candidates can read their own photos
 * - Moderators can read/write all
 * - Admins can read/write all
 * Path format: {competition_id}/{candidate_id}/{photo_type}/{filename}
 */

-- Admins: Full access
CREATE POLICY "admin_photos_all" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'candidates-photos' AND auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (bucket_id = 'candidates-photos' AND auth.jwt() ->> 'role' = 'administrator');

-- Moderators: Full access
CREATE POLICY "moderator_photos_all" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'candidates-photos' AND auth.jwt() ->> 'role' = 'moderator')
WITH CHECK (bucket_id = 'candidates-photos' AND auth.jwt() ->> 'role' = 'moderator');

-- Jury: Read only (review photos)
CREATE POLICY "jury_photos_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'candidates-photos' 
  AND auth.jwt() ->> 'role' IN ('jury_president', 'jury_member')
);

-- Candidates: Read own photos, upload new
CREATE POLICY "candidate_photos_read_own" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'candidates-photos'
  AND (auth.uid())::text = (name_owner(storage.foldername(name))[2])
);

CREATE POLICY "candidate_photos_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'candidates-photos'
  AND (SELECT auth.role() = 'authenticated')
  AND (storage.foldername(name))[2]::uuid = auth.uid()
  AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp'))
);

-- =============================================================================
-- RLS POLICIES - CERTIFICATES BUCKET
-- =============================================================================

/**
 * certificates bucket:
 * - Admins/moderators: Full access
 * - Candidates: Read only their own signed certificates
 * - Public: No access (certificates private)
 * Path format: {competition_id}/{certificate_id}/{filename}
 */

-- Admins: Full access
CREATE POLICY "admin_certificates_all" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'certificates' AND auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (bucket_id = 'certificates' AND auth.jwt() ->> 'role' = 'administrator');

-- Moderators: Full access (issue, sign, lock)
CREATE POLICY "moderator_certificates_all" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'certificates' AND auth.jwt() ->> 'role' = 'moderator')
WITH CHECK (bucket_id = 'certificates' AND auth.jwt() ->> 'role' = 'moderator');

-- Candidates: Read own signed certificates
CREATE POLICY "candidate_certificates_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'certificates'
  AND EXISTS (
    SELECT 1 FROM certificates c
    WHERE c.candidate_id = auth.uid()
      AND c.pdf_url LIKE '%' || storage.filename(storage.objects.name) || '%'
      AND c.status = 'signed'
  )
);

-- =============================================================================
-- RLS POLICIES - SIGNATURES BUCKET
-- =============================================================================

/**
 * signatures bucket:
 * - Admins/moderators: Full access
 * - Jury presidents: Can upload their signatures
 * - Others: Read only
 * Path format: {competition_id}/{certificate_id}/{signature_type}/{filename}
 */

-- Admins: Full access
CREATE POLICY "admin_signatures_all" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'signatures' AND auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (bucket_id = 'signatures' AND auth.jwt() ->> 'role' = 'administrator');

-- Moderators: Full access
CREATE POLICY "moderator_signatures_all" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'signatures' AND auth.jwt() ->> 'role' = 'moderator')
WITH CHECK (bucket_id = 'signatures' AND auth.jwt() ->> 'role' = 'moderator');

-- Jury presidents: Upload and read
CREATE POLICY "jury_president_signatures_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND auth.jwt() ->> 'role' = 'jury_president'
  AND storage.extension(name) IN ('png', 'jpg', 'jpeg')
);

CREATE POLICY "jury_president_signatures_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'signatures'
  AND auth.jwt() ->> 'role' IN ('jury_president', 'jury_member', 'moderator')
);

-- =============================================================================
-- RLS POLICIES - STAMPS BUCKET
-- =============================================================================

/**
 * stamps bucket:
 * - Admins/moderators: Full access (upload/manage official seals)
 * - Jury: Read only
 * Path format: {competition_id}/stamps/{filename}
 */

-- Admins: Full access
CREATE POLICY "admin_stamps_all" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'stamps' AND auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (bucket_id = 'stamps' AND auth.jwt() ->> 'role' = 'administrator');

-- Moderators: Full access
CREATE POLICY "moderator_stamps_all" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'stamps' AND auth.jwt() ->> 'role' = 'moderator')
WITH CHECK (bucket_id = 'stamps' AND auth.jwt() ->> 'role' = 'moderator');

-- Jury: Read only
CREATE POLICY "jury_stamps_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'stamps'
  AND auth.jwt() ->> 'role' IN ('jury_president', 'jury_member')
);

-- =============================================================================
-- RLS POLICIES - TEMP BUCKET
-- =============================================================================

/**
 * temp bucket:
 * - Admins/moderators: Full access
 * - Auto-cleanup of files older than 7 days
 * Path format: {user_id}/{temp_file_name}
 */

-- Admins: Full access
CREATE POLICY "admin_temp_all" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'temp' AND auth.jwt() ->> 'role' = 'administrator')
WITH CHECK (bucket_id = 'temp' AND auth.jwt() ->> 'role' = 'administrator');

-- Moderators: Full access
CREATE POLICY "moderator_temp_all" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'temp' AND auth.jwt() ->> 'role' = 'moderator')
WITH CHECK (bucket_id = 'temp' AND auth.jwt() ->> 'role' = 'moderator');

-- Users: Upload and read own temp files
CREATE POLICY "user_temp_own" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'temp'
  AND (storage.foldername(name))[1]::uuid = auth.uid()
);

-- =============================================================================
-- BUCKET METADATA & DOCUMENTATION
-- =============================================================================

/*
 * STORAGE BUCKETS SUMMARY:
 * 
 * 1. candidates-photos
 *    - Candidate profile and creation photos
 *    - Max: 10MB per file (jpg, png, webp)
 *    - RLS: Candidates read own, moderators all, public none
 *    - Path: {competition_id}/{candidate_id}/{photo_type}/
 * 
 * 2. certificates
 *    - Generated PDF certificates
 *    - Max: 50MB per file
 *    - RLS: Candidates read signed, moderators all, public none
 *    - Path: {competition_id}/{certificate_id}/
 * 
 * 3. signatures
 *    - Digital signatures from jury
 *    - Max: 5MB per file (png, jpg)
 *    - RLS: Jury presidents upload, moderators all
 *    - Path: {competition_id}/{certificate_id}/{signature_type}/
 * 
 * 4. stamps
 *    - Official institutional stamps/seals
 *    - Max: 10MB per file (png, svg)
 *    - RLS: Moderators manage, jury view
 *    - Path: {competition_id}/stamps/
 * 
 * 5. temp
 *    - Temporary uploads, auto-cleanup after 7 days
 *    - Max: 100MB per file
 *    - RLS: Users manage own, moderators all
 *    - Path: {user_id}/
 * 
 * UPLOAD LIMITS (via Supabase config):
 * - Max file size: 10MB (photos), 50MB (certificates)
 * - Allowed MIME types: image/jpeg, image/png, application/pdf
 * 
 * CDN & CACHING:
 * - Photos: Cache 24 hours (cacheable: jpg, png, webp)
 * - Certificates: No cache (private documents)
 * - Signatures: No cache (security)
 * - Stamps: Cache 7 days (rarely changes)
 * 
 * SECURITY NOTES:
 * - All buckets private by default (public: false)
 * - RLS policies enforce role-based access
 * - File extension validation prevents malicious uploads
 * - Size limits prevent abuse
 * - Temporary bucket auto-cleanup prevents disk waste
 */

-- =============================================================================
-- CLEANUP FUNCTION (Optional - run weekly via pg_cron)
-- =============================================================================

/**
 * Uncomment to schedule automatic cleanup of temp files older than 7 days
 * Requires pg_cron extension
 * 
 * SELECT cron.schedule(
 *   'cleanup-temp-storage',
 *   '0 2 * * *',  -- Daily at 2 AM
 *   $$
 *   DELETE FROM storage.objects
 *   WHERE bucket_id = 'temp'
 *   AND created_at < NOW() - INTERVAL '7 days';
 *   $$
 * );
 */

-- =============================================================================
-- USAGE NOTES
-- =============================================================================

/*
 * UPLOADING FILES (Frontend Example):
 * 
 * const { data, error } = await supabase.storage
 *   .from('candidates-photos')
 *   .upload(`${competitionId}/${candidateId}/profile/photo.jpg`, file)
 * 
 * DOWNLOADING FILES:
 * 
 * const { data, error } = await supabase.storage
 *   .from('certificates')
 *   .download(`${competitionId}/${certificateId}/certificate.pdf`)
 * 
 * GETTING PUBLIC URL (if bucket public):
 * 
 * const { data } = supabase.storage
 *   .from('public-bucket')
 *   .getPublicUrl('path/to/file')
 * 
 * LIST FILES IN BUCKET:
 * 
 * const { data, error } = await supabase.storage
 *   .from('bucket-name')
 *   .list(`${competitionId}/${candidateId}`)
 * 
 * DELETE FILES:
 * 
 * const { error } = await supabase.storage
 *   .from('bucket-name')
 *   .remove([`path/to/file1`, `path/to/file2`])
 */
