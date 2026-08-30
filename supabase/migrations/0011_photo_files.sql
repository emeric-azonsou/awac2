-- Stockage des fichiers photos directement dans Neon (aucun object storage tiers).
-- Servis par GET /api/photos/:id avec cache CDN immutable. candidate_photos.storage_key
-- et candidates.profile_photo_url référencent ces blobs via /api/photos/{id}.

CREATE TABLE IF NOT EXISTS photo_files (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  data         bytea NOT NULL,
  byte_size    integer NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
