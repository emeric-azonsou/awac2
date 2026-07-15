-- Catégories de candidats Hommes/Femmes (spec 2026-07-15-candidate-categories-design.md)
-- Appliqué le 2026-07-15 sur Neon (schéma géré à la main, pas d'outil de migration).
ALTER TABLE candidates
  ADD COLUMN category text NOT NULL DEFAULT 'homme'
  CHECK (category IN ('homme','femme'));

CREATE INDEX idx_candidates_category ON candidates(category);

-- Backfill des candidats existants (données de test) : prénoms féminins connus.
UPDATE candidates SET category = 'femme'
WHERE full_name ILIKE 'awa %'
   OR full_name ILIKE 'chantal %'
   OR full_name ILIKE 'estelle %';
