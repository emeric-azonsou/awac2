-- Soft-delete des candidats : la FK votes.candidate_id est ON DELETE CASCADE,
-- donc un hard delete effacerait les votes (records financiers) et casserait le
-- join candidate_name des reçus. On marque deleted_at à la place : le candidat
-- disparaît de la vitrine, ses votes et son nom restent pour la comptabilité.

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS candidates_active_idx ON candidates (deleted_at) WHERE deleted_at IS NULL;
