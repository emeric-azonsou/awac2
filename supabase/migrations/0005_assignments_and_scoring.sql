-- =============================================================================
-- AWAC MONO - Migration 0005: Candidate Assignments & Scoring System
-- =============================================================================
-- Tables:
--   1. candidate_assignments: Maps candidates to jury groups for each step
--   2. criteria: Scoring criteria for each step
--   3. candidate_scores: Individual scores from jury members
--   4. candidate_comments: Jury comments on candidates
--
-- Features:
--   - Multi-jury evaluation system with passage order
--   - Flexible scoring criteria with min/max ranges
--   - Dual validation workflow (submitted + validated)
--   - Audit trail for score modifications (edited_at, edited_by)
--   - Jury comment system with visibility control
--   - Comprehensive RLS policies
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE assignment_status AS ENUM (
  'pending',      -- Not yet started
  'in_progress',  -- Jury is evaluating
  'completed',    -- Evaluation finished
  'skipped'       -- Jury skipped/abstained
);

-- =============================================================================
-- TABLES
-- =============================================================================

/**
 * candidate_assignments: Links candidates to jury groups for each step
 * - Determines which jury group evaluates each candidate in each step
 * - passage_order: Order in which candidate appears in step evaluation
 * - status: Workflow status (pending → in_progress → completed)
 */
CREATE TABLE candidate_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  step_id UUID NOT NULL,
  jury_group_id UUID NOT NULL,
  passage_order INT NOT NULL,
  assigned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status assignment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT fk_assignments_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignments_step FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignments_jury_group FOREIGN KEY (jury_group_id) REFERENCES jury_groups(id) ON DELETE CASCADE,
  CONSTRAINT unique_assignment UNIQUE (candidate_id, step_id, jury_group_id),
  CONSTRAINT passage_order_positive CHECK (passage_order > 0)
);

-- Enable RLS
ALTER TABLE candidate_assignments ENABLE ROW LEVEL SECURITY;

/**
 * criteria: Scoring criteria for each step
 * - name: Criterion name (e.g., "Technique", "Presentation", "Creativity")
 * - weight: Percentage weight in final score (sum per step should = 100%)
 * - min_score, max_score: Range for scores (e.g., 0-20)
 */
CREATE TABLE criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  weight NUMERIC(5, 2) NOT NULL,
  min_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_score NUMERIC(10, 2) NOT NULL DEFAULT 20,
  criterion_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT fk_criteria_step FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE,
  CONSTRAINT weight_range CHECK (weight > 0 AND weight <= 100),
  CONSTRAINT score_range CHECK (min_score < max_score),
  CONSTRAINT criterion_order_positive CHECK (criterion_order > 0)
);

-- Enable RLS
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;

/**
 * candidate_scores: Individual scores from jury members
 * - One row per candidate per step per criterion per jury_group
 * - Dual workflow: submitted (initial) → validated (approved/modified)
 * - Edited tracking for audit purposes
 */
CREATE TABLE candidate_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  step_id UUID NOT NULL,
  criterion_id UUID NOT NULL,
  score NUMERIC(10, 2) NOT NULL,
  jury_group_id UUID NOT NULL,
  submitted_by UUID NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Validation workflow
  validated BOOLEAN NOT NULL DEFAULT false,
  validated_at TIMESTAMPTZ,
  validated_by UUID,
  
  -- Modification tracking
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  edited_by UUID,
  
  -- Notes and audit
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_scores_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_scores_step FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE,
  CONSTRAINT fk_scores_criterion FOREIGN KEY (criterion_id) REFERENCES criteria(id) ON DELETE CASCADE,
  CONSTRAINT fk_scores_jury_group FOREIGN KEY (jury_group_id) REFERENCES jury_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_scores_submitted_by FOREIGN KEY (submitted_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_scores_validated_by FOREIGN KEY (validated_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_scores_edited_by FOREIGN KEY (edited_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT unique_score_entry UNIQUE (candidate_id, step_id, criterion_id, jury_group_id),
  CONSTRAINT validated_requires_by CHECK (validated = false OR validated_by IS NOT NULL),
  CONSTRAINT edited_requires_by CHECK (is_edited = false OR edited_by IS NOT NULL)
);

-- Enable RLS
ALTER TABLE candidate_scores ENABLE ROW LEVEL SECURITY;

/**
 * candidate_comments: Jury comments on candidates per step
 * - Free-form feedback from jury to candidate or other jury members
 * - is_visible_to_candidate: If true, shown in candidate feedback portal
 */
CREATE TABLE candidate_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  step_id UUID NOT NULL,
  submitted_by UUID NOT NULL,
  comment TEXT NOT NULL,
  is_visible_to_candidate BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_comments_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_step FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_submitted_by FOREIGN KEY (submitted_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT comment_not_empty CHECK (LENGTH(TRIM(comment)) > 0)
);

-- Enable RLS
ALTER TABLE candidate_comments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- candidate_assignments indexes
CREATE INDEX idx_assignments_candidate_id ON candidate_assignments(candidate_id);
CREATE INDEX idx_assignments_step_id ON candidate_assignments(step_id);
CREATE INDEX idx_assignments_jury_group_id ON candidate_assignments(jury_group_id);
CREATE INDEX idx_assignments_status ON candidate_assignments(status);
CREATE INDEX idx_assignments_candidate_step ON candidate_assignments(candidate_id, step_id);
CREATE INDEX idx_assignments_step_jury ON candidate_assignments(step_id, jury_group_id);

-- criteria indexes
CREATE INDEX idx_criteria_step_id ON criteria(step_id);
CREATE INDEX idx_criteria_is_active ON criteria(is_active);
CREATE INDEX idx_criteria_step_active ON criteria(step_id, is_active);

-- candidate_scores indexes
CREATE INDEX idx_scores_candidate_id ON candidate_scores(candidate_id);
CREATE INDEX idx_scores_step_id ON candidate_scores(step_id);
CREATE INDEX idx_scores_criterion_id ON candidate_scores(criterion_id);
CREATE INDEX idx_scores_jury_group_id ON candidate_scores(jury_group_id);
CREATE INDEX idx_scores_submitted_by ON candidate_scores(submitted_by);
CREATE INDEX idx_scores_validated ON candidate_scores(validated);
CREATE INDEX idx_scores_is_edited ON candidate_scores(is_edited);
CREATE INDEX idx_scores_candidate_step ON candidate_scores(candidate_id, step_id);
CREATE INDEX idx_scores_submitted_at ON candidate_scores(submitted_at DESC);
CREATE INDEX idx_scores_validated_at ON candidate_scores(validated_at DESC);

-- candidate_comments indexes
CREATE INDEX idx_comments_candidate_id ON candidate_comments(candidate_id);
CREATE INDEX idx_comments_step_id ON candidate_comments(step_id);
CREATE INDEX idx_comments_submitted_by ON candidate_comments(submitted_by);
CREATE INDEX idx_comments_is_visible ON candidate_comments(is_visible_to_candidate);
CREATE INDEX idx_comments_candidate_step ON candidate_comments(candidate_id, step_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

/**
 * validate_score_range(): Ensure score is within criterion min/max
 */
CREATE OR REPLACE FUNCTION validate_score_range()
RETURNS TRIGGER AS $$
DECLARE
  v_min_score NUMERIC;
  v_max_score NUMERIC;
BEGIN
  SELECT min_score, max_score INTO v_min_score, v_max_score
  FROM criteria
  WHERE id = NEW.criterion_id;
  
  IF NEW.score < v_min_score OR NEW.score > v_max_score THEN
    RAISE EXCEPTION 'Score % is outside allowed range [%, %]', 
      NEW.score, v_min_score, v_max_score;
  END IF;
  
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

/**
 * validate_assignment_consistency(): Ensure assignment status is only updated by authorized users
 */
CREATE OR REPLACE FUNCTION validate_assignment_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark assignment as in_progress when first score submitted
  IF NEW.status = 'pending' AND EXISTS (
    SELECT 1 FROM candidate_scores
    WHERE candidate_id = NEW.candidate_id
      AND step_id = NEW.step_id
      AND jury_group_id = NEW.jury_group_id
  ) THEN
    NEW.status = 'in_progress';
  END IF;
  
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

/**
 * update_score_validation_audit(): Track when score is validated/edited
 */
CREATE OR REPLACE FUNCTION update_score_validation_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Track edited_at when score changes
  IF OLD.score IS DISTINCT FROM NEW.score THEN
    NEW.is_edited = true;
    NEW.edited_at = NOW();
    -- edited_by will be set by application layer
  END IF;
  
  -- Ensure validated_at is set when validated = true
  IF NEW.validated AND OLD.validated = false THEN
    NEW.validated_at = NOW();
  END IF;
  
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at on candidate_assignments
CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON candidate_assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on criteria
CREATE TRIGGER update_criteria_updated_at
BEFORE UPDATE ON criteria
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on candidate_scores
CREATE TRIGGER update_scores_updated_at
BEFORE UPDATE ON candidate_scores
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on candidate_comments
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON candidate_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Validate scores are within range
CREATE TRIGGER validate_score_range_before_insert
BEFORE INSERT ON candidate_scores
FOR EACH ROW
EXECUTE FUNCTION validate_score_range();

CREATE TRIGGER validate_score_range_before_update
BEFORE UPDATE ON candidate_scores
FOR EACH ROW
EXECUTE FUNCTION validate_score_range();

-- Track assignment status and validation audit
CREATE TRIGGER track_score_validation
BEFORE INSERT OR UPDATE ON candidate_scores
FOR EACH ROW
EXECUTE FUNCTION update_score_validation_audit();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- =====================================================================
-- CANDIDATE_ASSIGNMENTS TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY assignments_admin_all ON candidate_assignments
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY assignments_moderator_all ON candidate_assignments
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury president: Read assignments for their groups + active steps
CREATE POLICY assignments_president_select ON candidate_assignments
  FOR SELECT USING (
    get_user_role() = 'jury_president'
    AND EXISTS (
      SELECT 1 FROM jury_groups
      WHERE id = candidate_assignments.jury_group_id
        AND president_id = auth.uid()
        AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM steps s
      WHERE s.id = candidate_assignments.step_id
        AND s.status IN ('active', 'closed')
    )
  );

-- Jury member: Read assignments for their groups + active steps
CREATE POLICY assignments_member_select ON candidate_assignments
  FOR SELECT USING (
    get_user_role() = 'jury_member'
    AND EXISTS (
      SELECT 1 FROM jury_group_members
      WHERE jury_group_id = candidate_assignments.jury_group_id
        AND profile_id = auth.uid()
        AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM steps s
      WHERE s.id = candidate_assignments.step_id
        AND s.status IN ('active', 'closed')
    )
  );

-- Prevent jury from writing
CREATE POLICY assignments_jury_no_write ON candidate_assignments
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY assignments_jury_no_delete ON candidate_assignments
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =====================================================================
-- CRITERIA TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY criteria_admin_all ON criteria
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY criteria_moderator_all ON criteria
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury: Read only active criteria for active steps
CREATE POLICY criteria_jury_select ON criteria
  FOR SELECT USING (
    get_user_role() IN ('jury_president', 'jury_member')
    AND is_active = true
    AND EXISTS (
      SELECT 1 FROM steps
      WHERE id = criteria.step_id
        AND status IN ('active', 'closed')
    )
  );

-- Prevent jury from writing
CREATE POLICY criteria_jury_no_write ON criteria
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY criteria_jury_no_delete ON criteria
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =====================================================================
-- CANDIDATE_SCORES TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY scores_admin_all ON candidate_scores
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access (validate/edit scores)
CREATE POLICY scores_moderator_all ON candidate_scores
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury president: Submit scores for their group + validate scores
CREATE POLICY scores_president_select ON candidate_scores
  FOR SELECT USING (
    get_user_role() = 'jury_president'
    AND EXISTS (
      SELECT 1 FROM jury_groups
      WHERE id = candidate_scores.jury_group_id
        AND president_id = auth.uid()
        AND is_active = true
    )
  );

CREATE POLICY scores_president_insert ON candidate_scores
  FOR INSERT WITH CHECK (
    get_user_role() = 'jury_president'
    AND submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM jury_groups
      WHERE id = candidate_scores.jury_group_id
        AND president_id = auth.uid()
    )
  );

CREATE POLICY scores_president_update ON candidate_scores
  FOR UPDATE USING (
    get_user_role() = 'jury_president'
    AND (submitted_by = auth.uid() OR validated_by = auth.uid())
  )
  WITH CHECK (get_user_role() = 'jury_president');

-- Jury member: Submit scores for their group
CREATE POLICY scores_member_select ON candidate_scores
  FOR SELECT USING (
    get_user_role() = 'jury_member'
    AND (
      submitted_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM jury_group_members
        WHERE jury_group_id = candidate_scores.jury_group_id
          AND profile_id = auth.uid()
          AND is_active = true
      )
    )
  );

CREATE POLICY scores_member_insert ON candidate_scores
  FOR INSERT WITH CHECK (
    get_user_role() = 'jury_member'
    AND submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM jury_group_members
      WHERE jury_group_id = candidate_scores.jury_group_id
        AND profile_id = auth.uid()
        AND is_active = true
    )
  );

CREATE POLICY scores_member_update ON candidate_scores
  FOR UPDATE USING (
    get_user_role() = 'jury_member'
    AND submitted_by = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'jury_member'
    AND validated = false
  );

-- =====================================================================
-- CANDIDATE_COMMENTS TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY comments_admin_all ON candidate_comments
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY comments_moderator_all ON candidate_comments
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury president: Submit comments for their group
CREATE POLICY comments_president_select ON candidate_comments
  FOR SELECT USING (
    get_user_role() = 'jury_president'
    AND (
      submitted_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM jury_groups
        WHERE id IN (
          SELECT jury_group_id FROM candidate_assignments
          WHERE candidate_id = candidate_comments.candidate_id
            AND step_id = candidate_comments.step_id
        )
        AND president_id = auth.uid()
      )
    )
  );

CREATE POLICY comments_president_insert ON candidate_comments
  FOR INSERT WITH CHECK (
    get_user_role() = 'jury_president'
    AND submitted_by = auth.uid()
  );

-- Jury member: Submit comments for their group + read own comments
CREATE POLICY comments_member_select ON candidate_comments
  FOR SELECT USING (
    get_user_role() = 'jury_member'
    AND submitted_by = auth.uid()
  );

CREATE POLICY comments_member_insert ON candidate_comments
  FOR INSERT WITH CHECK (
    get_user_role() = 'jury_member'
    AND submitted_by = auth.uid()
  );

-- Candidates: Read only comments marked as visible
CREATE POLICY comments_candidate_select ON candidate_comments
  FOR SELECT USING (
    is_visible_to_candidate = true
    AND EXISTS (
      SELECT 1 FROM candidates
      WHERE id = candidate_comments.candidate_id
        AND id = auth.uid()
    )
  );

-- =============================================================================
-- VIEWS
-- =============================================================================

/**
 * step_scoring_summary: Aggregated scoring data per step
 * Used for dashboard and results generation
 */
CREATE OR REPLACE VIEW step_scoring_summary AS
SELECT 
  s.id AS step_id,
  s.name AS step_name,
  c.id AS competition_id,
  c.name AS competition_name,
  COUNT(DISTINCT ca.candidate_id) AS total_candidates,
  COUNT(DISTINCT ca.jury_group_id) AS assigned_jury_groups,
  COUNT(DISTINCT CASE WHEN ca.status = 'completed' THEN ca.candidate_id END) AS completed_evaluations,
  COUNT(DISTINCT CASE WHEN ca.status = 'in_progress' THEN ca.candidate_id END) AS in_progress_evaluations,
  COUNT(DISTINCT CASE WHEN ca.status = 'pending' THEN ca.candidate_id END) AS pending_evaluations,
  COUNT(DISTINCT cr.id) AS criteria_count,
  MAX(cr.weight) AS max_weight,
  s.status
FROM steps s
JOIN competitions c ON s.competition_id = c.id
LEFT JOIN candidate_assignments ca ON s.id = ca.step_id
LEFT JOIN criteria cr ON s.id = cr.step_id
GROUP BY s.id, c.id;

/**
 * candidate_step_scores: Aggregated scores per candidate per step
 * Shows average scores, validation status, and jury participation
 */
CREATE OR REPLACE VIEW candidate_step_scores AS
SELECT 
  ca.candidate_id,
  ca.step_id,
  cand.first_name || ' ' || cand.last_name AS candidate_name,
  s.name AS step_name,
  s.status AS step_status,
  COUNT(DISTINCT ca.jury_group_id) AS jury_groups_count,
  COUNT(DISTINCT CASE WHEN ca.status = 'completed' THEN ca.jury_group_id END) AS completed_groups,
  AVG(cs.score) AS average_score,
  MIN(cs.score) AS min_score,
  MAX(cs.score) AS max_score,
  COUNT(DISTINCT cs.id) AS total_scores_submitted,
  COUNT(DISTINCT CASE WHEN cs.validated THEN cs.id END) AS validated_scores,
  COUNT(DISTINCT cs.criterion_id) AS criteria_covered
FROM candidate_assignments ca
JOIN candidates cand ON ca.candidate_id = cand.id
JOIN steps s ON ca.step_id = s.id
LEFT JOIN candidate_scores cs ON ca.candidate_id = cs.candidate_id 
  AND ca.step_id = cs.step_id
  AND ca.jury_group_id = cs.jury_group_id
GROUP BY ca.candidate_id, ca.step_id, cand.id, s.id;

/**
 * jury_workload: Shows scoring workload per jury group per step
 * Used for load balancing and workload monitoring
 */
CREATE OR REPLACE VIEW jury_workload AS
SELECT 
  jg.id AS jury_group_id,
  jg.name AS group_name,
  s.id AS step_id,
  s.name AS step_name,
  COUNT(DISTINCT ca.candidate_id) AS candidates_assigned,
  COUNT(DISTINCT cs.id) AS scores_submitted,
  COUNT(DISTINCT CASE WHEN cs.validated THEN cs.id END) AS scores_validated,
  COUNT(DISTINCT CASE WHEN cs.validated = false THEN cs.id END) AS scores_pending_validation,
  jg.competition_id
FROM jury_groups jg
JOIN jury_group_steps jgs ON jg.id = jgs.jury_group_id
JOIN steps s ON jgs.step_id = s.id
LEFT JOIN candidate_assignments ca ON jg.id = ca.jury_group_id AND s.id = ca.step_id
LEFT JOIN candidate_scores cs ON ca.candidate_id = cs.candidate_id 
  AND ca.step_id = cs.step_id 
  AND ca.jury_group_id = cs.jury_group_id
WHERE jg.is_active = true
GROUP BY jg.id, s.id;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON candidate_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON candidate_scores TO authenticated;
GRANT SELECT, INSERT ON candidate_comments TO authenticated;
GRANT SELECT ON criteria TO authenticated;

-- Grant all views to authenticated
GRANT SELECT ON step_scoring_summary TO authenticated;
GRANT SELECT ON candidate_step_scores TO authenticated;
GRANT SELECT ON jury_workload TO authenticated;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================

/**
 * MIGRATION FLOW:
 * 1. Create ENUM type for assignment status
 * 2. Create candidate_assignments table (candidate → jury_group per step)
 * 3. Create criteria table with scoring ranges
 * 4. Create candidate_scores with dual workflow (submitted/validated)
 * 5. Create candidate_comments with visibility control
 * 6. Create validation functions and triggers
 * 7. Apply RLS policies (admin, moderator, jury, candidate levels)
 * 8. Create views for dashboard and workload monitoring
 *
 * TESTING CHECKLIST:
 * □ Create assignments and verify passage_order logic
 * □ Create criteria and test weight validation
 * □ Submit scores and verify range validation
 * □ Test validation workflow (submitted → validated)
 * □ Test editing tracking (is_edited, edited_by, edited_at)
 * □ Test RLS: jury_member can only insert own scores
 * □ Test RLS: moderator can validate scores
 * □ Verify views aggregate correctly
 * □ Test candidate comment visibility control
 * 
 * DEPENDENCIES:
 * - Requires: migrations 0001, 0002, 0003, 0004
 * - Changes: Creates 4 new tables + 3 views
 * - Breaking: None
 * 
 * NOTES:
 * - Score validation enforces min/max per criterion
 * - Edited tracking independent of validation workflow
 * - Submitted_by and edited_by allow tracking who modified score
 * - Comments visibility controlled by moderators
 */
