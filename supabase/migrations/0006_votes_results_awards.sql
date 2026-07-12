-- =============================================================================
-- AWAC MONO - Migration 0006: Public Votes, Results & Special Awards
-- =============================================================================
-- Tables:
--   1. public_votes: Public voting system with mobile operator support
--   2. competition_results: Final results with ranking and scoring
--   3. special_awards: Additional recognition awards
--   4. award_winners: Links candidates to special awards they won
--
-- Features:
--   - Multi-operator voting (MTN, Moov, Celtis, Demo)
--   - Vote verification system
--   - Transaction tracking for audit
--   - Dynamic ranking by gender and overall
--   - Special awards system with custom criteria
--   - Comprehensive RLS policies
--   - Results publication workflow
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE mobile_operator AS ENUM (
  'mtn',
  'moov',
  'celtis',
  'demo'
);

CREATE TYPE vote_status AS ENUM (
  'pending',      -- Not yet verified
  'verified',     -- Verified and counted
  'rejected',     -- Invalid or duplicate
  'refunded'      -- Refund processed
);

CREATE TYPE result_status AS ENUM (
  'pending',      -- Scores collected, not finalized
  'finalized',    -- All votes counted, results computed
  'published'     -- Results publicly available
);

-- =============================================================================
-- TABLES
-- =============================================================================

/**
 * public_votes: Tracks votes from public via SMS/USSD
 * - Supports multiple mobile operators
 * - Tracks transaction reference for duplicate prevention
 * - Vote verification system with batch processing
 * - Amount paid tracked for each vote
 */
CREATE TABLE public_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  competition_id UUID NOT NULL,
  operator mobile_operator NOT NULL,
  transaction_reference VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  amount NUMERIC(10, 2),
  status vote_status NOT NULL DEFAULT 'pending',
  vote_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  rejection_reason TEXT,
  refund_amount NUMERIC(10, 2),
  refund_date TIMESTAMPTZ,
  refund_processed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_votes_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_competition FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_verified_by FOREIGN KEY (verified_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_votes_refund_by FOREIGN KEY (refund_processed_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT unique_transaction UNIQUE (operator, transaction_reference),
  CONSTRAINT amount_positive CHECK (amount > 0),
  CONSTRAINT refund_valid CHECK (refund_amount IS NULL OR refund_amount > 0)
);

-- Enable RLS
ALTER TABLE public_votes ENABLE ROW LEVEL SECURITY;

/**
 * competition_results: Final results and rankings
 * - Computed from jury_scores + public_votes
 * - Separate rankings by gender and overall
 * - Status workflow: pending → finalized → published
 * - Immutable once published
 */
CREATE TABLE competition_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  
  -- Scoring components
  jury_score NUMERIC(10, 2),
  public_score NUMERIC(10, 2),
  public_vote_count INT DEFAULT 0,
  final_score NUMERIC(10, 2),
  
  -- Rankings
  gender_rank INT,
  overall_rank INT,
  
  -- Status and publication
  status result_status NOT NULL DEFAULT 'pending',
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_changed_by UUID,
  
  -- Metadata
  calculation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_results_competition FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_results_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_results_status_by FOREIGN KEY (status_changed_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT unique_result UNIQUE (competition_id, candidate_id),
  CONSTRAINT rank_positive CHECK (gender_rank > 0 AND overall_rank > 0),
  CONSTRAINT vote_count_positive CHECK (public_vote_count >= 0)
);

-- Enable RLS
ALTER TABLE competition_results ENABLE ROW LEVEL SECURITY;

/**
 * special_awards: Non-ranking awards (Best Creativity, Audience Choice, etc.)
 * - Defined by competition organizers
 * - Multiple awards per competition
 * - Ordered for display purposes
 */
CREATE TABLE special_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria TEXT,
  award_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT fk_awards_competition FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  CONSTRAINT award_order_positive CHECK (award_order > 0)
);

-- Enable RLS
ALTER TABLE special_awards ENABLE ROW LEVEL SECURITY;

/**
 * award_winners: Candidate recipients of special awards
 * - Links candidates to special_awards
 * - One candidate can win multiple awards
 * - Tracked for announcement and certificates
 */
CREATE TABLE award_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  special_award_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  award_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  award_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT fk_winners_award FOREIGN KEY (special_award_id) REFERENCES special_awards(id) ON DELETE CASCADE,
  CONSTRAINT fk_winners_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_winners_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT unique_award_winner UNIQUE (special_award_id, candidate_id)
);

-- Enable RLS
ALTER TABLE award_winners ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- public_votes indexes
CREATE INDEX idx_votes_candidate_id ON public_votes(candidate_id);
CREATE INDEX idx_votes_competition_id ON public_votes(competition_id);
CREATE INDEX idx_votes_operator ON public_votes(operator);
CREATE INDEX idx_votes_status ON public_votes(status);
CREATE INDEX idx_votes_phone_number ON public_votes(phone_number);
CREATE INDEX idx_votes_transaction_ref ON public_votes(transaction_reference);
CREATE INDEX idx_votes_vote_date ON public_votes(vote_date DESC);
CREATE INDEX idx_votes_verified_at ON public_votes(verified_at DESC);
CREATE INDEX idx_votes_competition_status ON public_votes(competition_id, status);

-- competition_results indexes
CREATE INDEX idx_results_competition_id ON competition_results(competition_id);
CREATE INDEX idx_results_candidate_id ON competition_results(candidate_id);
CREATE INDEX idx_results_status ON competition_results(status);
CREATE INDEX idx_results_gender_rank ON competition_results(gender_rank);
CREATE INDEX idx_results_overall_rank ON competition_results(overall_rank);
CREATE INDEX idx_results_competition_status ON competition_results(competition_id, status);
CREATE INDEX idx_results_final_score ON competition_results(final_score DESC);

-- special_awards indexes
CREATE INDEX idx_awards_competition_id ON special_awards(competition_id);
CREATE INDEX idx_awards_is_active ON special_awards(is_active);
CREATE INDEX idx_awards_order ON special_awards(competition_id, award_order);

-- award_winners indexes
CREATE INDEX idx_winners_special_award_id ON award_winners(special_award_id);
CREATE INDEX idx_winners_candidate_id ON award_winners(candidate_id);
CREATE INDEX idx_winners_award_date ON award_winners(award_date DESC);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

/**
 * calculate_public_score_from_votes(): Compute public score from vote count
 * Formula: (vote_count / max_votes) * 20 (normalized to 20 points)
 * Parameterized by competition settings
 */
CREATE OR REPLACE FUNCTION calculate_public_score_from_votes(
  p_vote_count INT,
  p_max_possible_votes INT DEFAULT 1000
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN LEAST(20, (p_vote_count::NUMERIC / p_max_possible_votes) * 20);
END
$$ LANGUAGE plpgsql;

/**
 * calculate_final_score(): Combine jury and public scores
 * Weights: 60% jury + 40% public (configurable per competition)
 */
CREATE OR REPLACE FUNCTION calculate_final_score(
  p_jury_score NUMERIC,
  p_public_score NUMERIC,
  p_jury_weight NUMERIC DEFAULT 0.6
)
RETURNS NUMERIC AS $$
BEGIN
  IF p_jury_score IS NULL AND p_public_score IS NULL THEN
    RETURN NULL;
  ELSIF p_jury_score IS NULL THEN
    RETURN p_public_score;
  ELSIF p_public_score IS NULL THEN
    RETURN p_jury_score;
  ELSE
    RETURN ROUND((p_jury_score * p_jury_weight) + (p_public_score * (1 - p_jury_weight)), 2);
  END IF;
END
$$ LANGUAGE plpgsql;

/**
 * compute_competition_rankings(): Calculate gender and overall rankings
 * Called when finalizing results
 */
CREATE OR REPLACE FUNCTION compute_competition_rankings(p_competition_id UUID)
RETURNS TABLE(candidate_id UUID, gender_rank INT, overall_rank INT) AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT 
      cr.candidate_id,
      c.gender,
      cr.final_score,
      ROW_NUMBER() OVER (
        PARTITION BY c.gender ORDER BY cr.final_score DESC NULLS LAST
      ) AS gender_rank,
      ROW_NUMBER() OVER (
        ORDER BY cr.final_score DESC NULLS LAST
      ) AS overall_rank
    FROM competition_results cr
    JOIN candidates c ON cr.candidate_id = c.id
    WHERE cr.competition_id = p_competition_id
      AND cr.status != 'pending'
  )
  SELECT ranked.candidate_id, ranked.gender_rank::INT, ranked.overall_rank::INT
  FROM ranked;
END
$$ LANGUAGE plpgsql;

/**
 * validate_vote_uniqueness(): Prevent duplicate votes per operator/phone/candidate
 */
CREATE OR REPLACE FUNCTION validate_vote_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public_votes
    WHERE candidate_id = NEW.candidate_id
      AND competition_id = NEW.competition_id
      AND phone_number = NEW.phone_number
      AND operator = NEW.operator
      AND status IN ('verified', 'pending')
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Duplicate vote from % for this candidate via %', 
      NEW.phone_number, NEW.operator;
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at on public_votes
CREATE TRIGGER update_votes_updated_at
BEFORE UPDATE ON public_votes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on competition_results
CREATE TRIGGER update_results_updated_at
BEFORE UPDATE ON competition_results
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on special_awards
CREATE TRIGGER update_awards_updated_at
BEFORE UPDATE ON special_awards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on award_winners
CREATE TRIGGER update_winners_updated_at
BEFORE UPDATE ON award_winners
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Validate vote uniqueness
CREATE TRIGGER validate_vote_uniqueness_insert
BEFORE INSERT ON public_votes
FOR EACH ROW
EXECUTE FUNCTION validate_vote_uniqueness();

CREATE TRIGGER validate_vote_uniqueness_update
BEFORE UPDATE ON public_votes
FOR EACH ROW
EXECUTE FUNCTION validate_vote_uniqueness();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- =====================================================================
-- PUBLIC_VOTES TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY votes_admin_all ON public_votes
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access (verify/reject votes)
CREATE POLICY votes_moderator_all ON public_votes
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury members: Read only
CREATE POLICY votes_jury_select ON public_votes
  FOR SELECT USING (get_user_role() IN ('jury_president', 'jury_member'));

-- Prevent jury from writing
CREATE POLICY votes_jury_no_write ON public_votes
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY votes_jury_no_delete ON public_votes
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- Public: No access (votes are server-managed)
CREATE POLICY votes_public_blocked ON public_votes
  FOR ALL USING (false);

-- =====================================================================
-- COMPETITION_RESULTS TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY results_admin_all ON competition_results
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access (finalize/publish results)
CREATE POLICY results_moderator_all ON competition_results
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury: Read only results
CREATE POLICY results_jury_select ON competition_results
  FOR SELECT USING (
    get_user_role() IN ('jury_president', 'jury_member')
    AND (status = 'published' OR status = 'finalized')
  );

-- Jury cannot write
CREATE POLICY results_jury_no_write ON competition_results
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY results_jury_no_delete ON competition_results
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- Public: Read only published results
CREATE POLICY results_public_select ON competition_results
  FOR SELECT USING (status = 'published');

-- =====================================================================
-- SPECIAL_AWARDS TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY awards_admin_all ON special_awards
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY awards_moderator_all ON special_awards
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury: Read active awards
CREATE POLICY awards_jury_select ON special_awards
  FOR SELECT USING (
    get_user_role() IN ('jury_president', 'jury_member')
    AND is_active = true
  );

-- Prevent jury from writing
CREATE POLICY awards_jury_no_write ON special_awards
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY awards_jury_no_delete ON special_awards
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- Public: Read active awards
CREATE POLICY awards_public_select ON special_awards
  FOR SELECT USING (is_active = true);

-- =====================================================================
-- AWARD_WINNERS TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY winners_admin_all ON award_winners
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY winners_moderator_all ON award_winners
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury: Read only
CREATE POLICY winners_jury_select ON award_winners
  FOR SELECT USING (get_user_role() IN ('jury_president', 'jury_member'));

-- Prevent jury from writing
CREATE POLICY winners_jury_no_write ON award_winners
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY winners_jury_no_delete ON award_winners
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- Public: Read only
CREATE POLICY winners_public_select ON award_winners
  FOR SELECT USING (true);

-- =============================================================================
-- VIEWS
-- =============================================================================

/**
 * vote_statistics_by_operator: Aggregate vote statistics by operator
 * Used for reconciliation and financial reporting
 */
CREATE OR REPLACE VIEW vote_statistics_by_operator AS
SELECT 
  pv.competition_id,
  c.name AS competition_name,
  pv.operator,
  COUNT(DISTINCT pv.id) AS total_votes,
  COUNT(DISTINCT CASE WHEN pv.status = 'verified' THEN pv.id END) AS verified_votes,
  COUNT(DISTINCT CASE WHEN pv.status = 'pending' THEN pv.id END) AS pending_votes,
  COUNT(DISTINCT CASE WHEN pv.status = 'rejected' THEN pv.id END) AS rejected_votes,
  COUNT(DISTINCT CASE WHEN pv.status = 'refunded' THEN pv.id END) AS refunded_votes,
  SUM(CASE WHEN pv.status = 'verified' THEN pv.amount ELSE 0 END) AS revenue,
  SUM(CASE WHEN pv.status = 'refunded' THEN pv.refund_amount ELSE 0 END) AS refunds,
  COUNT(DISTINCT pv.phone_number) AS unique_voters
FROM public_votes pv
JOIN competitions c ON pv.competition_id = c.id
GROUP BY pv.competition_id, c.id, pv.operator;

/**
 * candidate_final_rankings: Complete final rankings with all scoring details
 * Used for results publication and certificate generation
 */
CREATE OR REPLACE VIEW candidate_final_rankings AS
SELECT 
  cr.competition_id,
  c.name AS competition_name,
  cr.candidate_id,
  cand.first_name || ' ' || cand.last_name AS candidate_name,
  cand.gender,
  cand.category,
  cr.jury_score,
  cr.public_vote_count,
  cr.public_score,
  cr.final_score,
  cr.gender_rank,
  cr.overall_rank,
  cr.status,
  COUNT(DISTINCT aw.id) AS award_count
FROM competition_results cr
JOIN competitions c ON cr.competition_id = c.id
JOIN candidates cand ON cr.candidate_id = cand.id
LEFT JOIN award_winners aw ON cand.id = aw.candidate_id 
  AND EXISTS (
    SELECT 1 FROM special_awards sa
    WHERE sa.id = aw.special_award_id
      AND sa.competition_id = cr.competition_id
  )
WHERE cr.status IN ('finalized', 'published')
GROUP BY cr.id, c.id, cand.id;

/**
 * awards_summary: List all award winners with award details
 * Used for announcement and certificate generation
 */
CREATE OR REPLACE VIEW awards_summary AS
SELECT 
  sa.competition_id,
  c.name AS competition_name,
  sa.id AS award_id,
  sa.name AS award_name,
  sa.award_order,
  COUNT(DISTINCT aw.candidate_id) AS winner_count,
  STRING_AGG(
    cand.first_name || ' ' || cand.last_name, 
    ', ' 
    ORDER BY cand.first_name
  ) AS winners
FROM special_awards sa
JOIN competitions c ON sa.competition_id = c.id
LEFT JOIN award_winners aw ON sa.id = aw.special_award_id
LEFT JOIN candidates cand ON aw.candidate_id = cand.id
WHERE sa.is_active = true
GROUP BY sa.id, c.id;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON public_votes TO authenticated;
GRANT SELECT ON competition_results TO authenticated;
GRANT SELECT ON special_awards TO authenticated;
GRANT SELECT ON award_winners TO authenticated;

-- Grant all views to authenticated
GRANT SELECT ON vote_statistics_by_operator TO authenticated;
GRANT SELECT ON candidate_final_rankings TO authenticated;
GRANT SELECT ON awards_summary TO authenticated;

-- Public views
GRANT SELECT ON candidate_final_rankings TO anon;
GRANT SELECT ON awards_summary TO anon;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================

/**
 * MIGRATION FLOW:
 * 1. Create ENUM types for operators, vote status, result status
 * 2. Create public_votes table with transaction tracking
 * 3. Create competition_results table with status workflow
 * 4. Create special_awards and award_winners tables
 * 5. Create scoring calculation functions
 * 6. Create ranking computation function
 * 7. Apply RLS policies (admin, moderator, jury, public levels)
 * 8. Create views for statistics and results publication
 *
 * TESTING CHECKLIST:
 * □ Submit test votes from different operators
 * □ Verify transaction reference uniqueness
 * □ Test vote verification workflow
 * □ Calculate public scores from vote counts
 * □ Test final score computation (jury + public)
 * □ Compute rankings and verify ordering
 * □ Test RLS: moderators can verify votes
 * □ Test RLS: jury can read results only if published
 * □ Test RLS: public can read published results
 * □ Create special awards and assign winners
 * □ Verify views aggregate correctly
 * 
 * DEPENDENCIES:
 * - Requires: migrations 0001-0005
 * - Changes: Creates 4 new tables + 3 views
 * - Breaking: None
 * 
 * NOTES:
 * - Vote verification is manual process by moderators
 * - Public scores calculated from vote count (20pt scale)
 * - Final score = 60% jury + 40% public (configurable)
 * - Rankings computed separate for each gender + overall
 * - Awards workflow: created by moderators → assigned to winners
 * - Results publication: pending → finalized → published
 * - Vote amounts tracked for revenue reconciliation
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Vote statistics queries may need pagination for large datasets
 * - Consider materialized view for candidate_final_rankings if slow
 * - Index on (competition_id, status) speeds up result queries
 */
