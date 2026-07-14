-- Invalidation de session côté serveur. Les sessions scellées (cookie h3) sont
-- stateless : session.clear() ne retire le cookie que du navigateur, un token
-- capturé resterait valide jusqu'à expiration. token_version, embarqué dans la
-- session et incrémenté au logout, rend caducs tous les tokens émis avant.

ALTER TABLE admins ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;
