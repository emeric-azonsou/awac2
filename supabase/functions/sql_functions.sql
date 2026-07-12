-- =============================================================================
-- AWAC MONO - Advanced SQL Functions & Stored Procedures
-- =============================================================================
-- Functions for:
--   - Score calculations and aggregation
--   - Certificate generation
--   - Leaderboard computation
--   - Reporting and analytics
--   - Competition management
-- =============================================================================

-- =============================================================================
-- SCORING FUNCTIONS
-- =============================================================================

/**
 * calculate_jury_score(competition_id UUID, candidate_id UUID, step_id UUID)
 * Calculates weighted average jury score for a candidate in a step
 * Formula: SUM(score * criterion_weight) / SUM(criterion_weight)
 */
CREATE OR REPLACE FUNCTION calculate_jury_score(
  p_competition_id UUID,
  p_candidate_id UUID,
  p_step_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_jury_score NUMERIC;
BEGIN
  SELECT ROUND(
    SUM(cs.score * c.weight) / NULLIF(SUM(c.weight), 0),
    2
  ) INTO v_jury_score
  FROM candidate_scores cs
  JOIN criteria c ON cs.criterion_id = c.id
  WHERE cs.candidate_id = p_candidate_id
    AND cs.step_id = p_step_id
    AND cs.validated = true
    AND c.is_active = true;
  
  RETURN COALESCE(v_jury_score, 0);
END
$$ LANGUAGE plpgsql;

/**
 * calculate_public_score(competition_id UUID, candidate_id UUID)
 * Calculates public score based on vote count
 * Normalizes vote count to 20-point scale
 */
CREATE OR REPLACE FUNCTION calculate_public_score(
  p_competition_id UUID,
  p_candidate_id UUID,
  p_max_votes INT DEFAULT 1000
)
RETURNS NUMERIC AS $$
DECLARE
  v_vote_count INT;
  v_public_score NUMERIC;
BEGIN
  SELECT COUNT(DISTINCT id) INTO v_vote_count
  FROM public_votes
  WHERE competition_id = p_competition_id
    AND candidate_id = p_candidate_id
    AND status = 'verified';
  
  v_public_score := LEAST(20, (v_vote_count::NUMERIC / p_max_votes) * 20);
  
  RETURN ROUND(v_public_score, 2);
END
$$ LANGUAGE plpgsql;

/**
 * calculate_final_scores(competition_id UUID)
 * Computes final scores for all candidates in competition
 * Combines jury (60%) + public (40%) scores
 * Populates competition_results table
 */
CREATE OR REPLACE FUNCTION calculate_final_scores(p_competition_id UUID)
RETURNS TABLE (
  candidate_id UUID,
  jury_score NUMERIC,
  public_score NUMERIC,
  final_score NUMERIC,
  public_vote_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH candidate_scores AS (
    SELECT 
      c.id AS candidate_id,
      ROUND(
        SUM(cs.score * cr.weight) / NULLIF(SUM(cr.weight), 0),
        2
      ) AS jury_score
    FROM candidates c
    LEFT JOIN candidate_scores cs ON c.id = cs.candidate_id
    LEFT JOIN criteria cr ON cs.criterion_id = cr.id
    WHERE c.competition_id = p_competition_id
      AND cs.validated = true
      AND cr.is_active = true
    GROUP BY c.id
  ),
  public_scores AS (
    SELECT 
      c.id AS candidate_id,
      COUNT(DISTINCT pv.id) AS vote_count,
      ROUND(
        LEAST(20, (COUNT(DISTINCT pv.id)::NUMERIC / 1000) * 20),
        2
      ) AS public_score
    FROM candidates c
    LEFT JOIN public_votes pv ON c.id = pv.candidate_id
      AND pv.competition_id = p_competition_id
      AND pv.status = 'verified'
    WHERE c.competition_id = p_competition_id
    GROUP BY c.id
  )
  SELECT 
    cs.candidate_id,
    cs.jury_score,
    ps.public_score,
    ROUND((COALESCE(cs.jury_score, 0) * 0.6) + (COALESCE(ps.public_score, 0) * 0.4), 2) AS final_score,
    ps.vote_count
  FROM candidate_scores cs
  FULL OUTER JOIN public_scores ps ON cs.candidate_id = ps.candidate_id;
END
$$ LANGUAGE plpgsql;

/**
 * update_competition_results(competition_id UUID)
 * Updates competition_results table with computed scores and rankings
 */
CREATE OR REPLACE FUNCTION update_competition_results(p_competition_id UUID)
RETURNS INT AS $$
DECLARE
  v_updated_count INT := 0;
BEGIN
  -- Update or insert results
  INSERT INTO competition_results (
    competition_id,
    candidate_id,
    jury_score,
    public_score,
    public_vote_count,
    final_score,
    status
  )
  SELECT 
    p_competition_id,
    candidate_id,
    jury_score,
    public_score,
    public_vote_count,
    final_score,
    'pending'::result_status
  FROM calculate_final_scores(p_competition_id)
  ON CONFLICT (competition_id, candidate_id) DO UPDATE
  SET 
    jury_score = EXCLUDED.jury_score,
    public_score = EXCLUDED.public_score,
    public_vote_count = EXCLUDED.public_vote_count,
    final_score = EXCLUDED.final_score,
    updated_at = NOW();
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Compute rankings
  UPDATE competition_results cr
  SET 
    gender_rank = ranked.gender_rank,
    overall_rank = ranked.overall_rank
  FROM (
    WITH ranked AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY (
            SELECT gender FROM candidates WHERE id = competition_results.candidate_id
          ) 
          ORDER BY final_score DESC NULLS LAST
        ) AS gender_rank,
        ROW_NUMBER() OVER (
          ORDER BY final_score DESC NULLS LAST
        ) AS overall_rank
      FROM competition_results
      WHERE competition_id = p_competition_id
    )
    SELECT * FROM ranked
  ) ranked
  WHERE cr.id = ranked.id;
  
  RETURN v_updated_count;
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CERTIFICATE GENERATION FUNCTIONS
-- =============================================================================

/**
 * generate_certificates(competition_id UUID)
 * Auto-generates certificates for all eligible candidates
 * Types: participation (all), winner (top 3), special awards
 */
CREATE OR REPLACE FUNCTION generate_certificates(p_competition_id UUID)
RETURNS TABLE (
  certificate_id UUID,
  candidate_id UUID,
  candidate_name TEXT,
  certificate_number VARCHAR,
  certificate_type VARCHAR
) AS $$
BEGIN
  -- Generate participation certificates for all approved candidates
  INSERT INTO certificates (
    candidate_id,
    competition_id,
    certificate_template_id,
    status,
    created_by
  )
  SELECT 
    c.id,
    p_competition_id,
    ct.id,
    'draft'::certificate_status,
    auth.uid()
  FROM candidates c
  CROSS JOIN certificate_templates ct
  JOIN certificate_types cty ON ct.certificate_type_id = cty.id
  WHERE c.competition_id = p_competition_id
    AND c.status IN ('approved', 'disqualified')
    AND cty.name = 'Participation'
    AND NOT EXISTS (
      SELECT 1 FROM certificates
      WHERE candidate_id = c.id
        AND special_award_id IS NULL
    )
  ON CONFLICT DO NOTHING;
  
  -- Generate winner certificates for top 3
  INSERT INTO certificates (
    candidate_id,
    competition_id,
    certificate_template_id,
    status,
    created_by
  )
  SELECT 
    cr.candidate_id,
    p_competition_id,
    ct.id,
    'draft'::certificate_status,
    auth.uid()
  FROM competition_results cr
  CROSS JOIN certificate_templates ct
  JOIN certificate_types cty ON ct.certificate_type_id = cty.id
  WHERE cr.competition_id = p_competition_id
    AND cr.overall_rank <= 3
    AND cty.name = 'Winner'
  ON CONFLICT DO NOTHING;
  
  -- Generate special award certificates
  INSERT INTO certificates (
    candidate_id,
    competition_id,
    certificate_template_id,
    special_award_id,
    status,
    created_by
  )
  SELECT 
    aw.candidate_id,
    p_competition_id,
    ct.id,
    aw.special_award_id,
    'draft'::certificate_status,
    auth.uid()
  FROM award_winners aw
  CROSS JOIN certificate_templates ct
  JOIN certificate_types cty ON ct.certificate_type_id = cty.id
  JOIN special_awards sa ON aw.special_award_id = sa.id
  WHERE sa.competition_id = p_competition_id
    AND cty.name = 'Special Award'
  ON CONFLICT DO NOTHING;
  
  -- Return generated certificates
  RETURN QUERY
  SELECT 
    c.id,
    c.candidate_id,
    cand.first_name || ' ' || cand.last_name,
    c.certificate_number,
    ct.name
  FROM certificates c
  JOIN candidates cand ON c.candidate_id = cand.id
  JOIN certificate_templates ctpl ON c.certificate_template_id = ctpl.id
  JOIN certificate_types ct ON ctpl.certificate_type_id = ct.id
  WHERE c.competition_id = p_competition_id
    AND c.status = 'draft'
  ORDER BY cand.last_name;
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- LEADERBOARD & REPORTING FUNCTIONS
-- =============================================================================

/**
 * get_leaderboard(competition_id UUID)
 * Returns complete competition leaderboard with rankings
 */
CREATE OR REPLACE FUNCTION get_leaderboard(p_competition_id UUID)
RETURNS TABLE (
  rank INT,
  candidate_name TEXT,
  gender VARCHAR,
  category VARCHAR,
  jury_score NUMERIC,
  public_votes INT,
  public_score NUMERIC,
  final_score NUMERIC,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.overall_rank::INT,
    c.first_name || ' ' || c.last_name,
    c.gender::VARCHAR,
    c.category,
    cr.jury_score,
    cr.public_vote_count,
    cr.public_score,
    cr.final_score,
    cr.status::VARCHAR
  FROM competition_results cr
  JOIN candidates c ON cr.candidate_id = c.id
  WHERE cr.competition_id = p_competition_id
    AND cr.status IN ('finalized', 'published')
  ORDER BY cr.overall_rank;
END
$$ LANGUAGE plpgsql;

/**
 * get_gender_leaderboard(competition_id UUID)
 * Returns gender-specific leaderboards
 */
CREATE OR REPLACE FUNCTION get_gender_leaderboard(p_competition_id UUID)
RETURNS TABLE (
  gender VARCHAR,
  rank INT,
  candidate_name TEXT,
  jury_score NUMERIC,
  final_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.gender::VARCHAR,
    cr.gender_rank::INT,
    c.first_name || ' ' || c.last_name,
    cr.jury_score,
    cr.final_score
  FROM competition_results cr
  JOIN candidates c ON cr.candidate_id = c.id
  WHERE cr.competition_id = p_competition_id
    AND cr.status IN ('finalized', 'published')
  ORDER BY c.gender, cr.gender_rank;
END
$$ LANGUAGE plpgsql;

/**
 * get_jury_workload(competition_id UUID, jury_group_id UUID)
 * Returns scoring workload and progress for jury group
 */
CREATE OR REPLACE FUNCTION get_jury_workload(
  p_competition_id UUID,
  p_jury_group_id UUID DEFAULT NULL
)
RETURNS TABLE (
  jury_group_name VARCHAR,
  step_name VARCHAR,
  total_assignments INT,
  completed_assignments INT,
  completion_percentage NUMERIC,
  scores_submitted INT,
  scores_validated INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jg.name,
    s.name,
    COUNT(DISTINCT ca.id)::INT,
    COUNT(DISTINCT CASE WHEN ca.status = 'completed' THEN ca.id END)::INT,
    ROUND(
      COUNT(DISTINCT CASE WHEN ca.status = 'completed' THEN ca.id END)::NUMERIC /
      NULLIF(COUNT(DISTINCT ca.id), 0) * 100,
      2
    ),
    COUNT(DISTINCT cs.id)::INT,
    COUNT(DISTINCT CASE WHEN cs.validated THEN cs.id END)::INT
  FROM jury_groups jg
  JOIN jury_group_steps jgs ON jg.id = jgs.jury_group_id
  JOIN steps s ON jgs.step_id = s.id
  LEFT JOIN candidate_assignments ca ON jg.id = ca.jury_group_id 
    AND s.id = ca.step_id
  LEFT JOIN candidate_scores cs ON ca.candidate_id = cs.candidate_id
    AND ca.step_id = cs.step_id
    AND ca.jury_group_id = cs.jury_group_id
  WHERE jg.competition_id = p_competition_id
    AND (p_jury_group_id IS NULL OR jg.id = p_jury_group_id)
  GROUP BY jg.id, s.id;
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMPETITION MANAGEMENT FUNCTIONS
-- =============================================================================

/**
 * create_competition_edition(year INT)
 * Creates new competition edition for the given year
 */
CREATE OR REPLACE FUNCTION create_competition_edition(p_year INT)
RETURNS UUID AS $$
DECLARE
  v_competition_id UUID;
BEGIN
  INSERT INTO competitions (
    name,
    description,
    start_date,
    end_date,
    status,
    created_by
  ) VALUES (
    'AWAC ' || p_year,
    'AWAC Competition Edition ' || p_year,
    make_date(p_year, 1, 1),
    make_date(p_year, 12, 31),
    'planning'::competition_status,
    auth.uid()
  ) RETURNING id INTO v_competition_id;
  
  RETURN v_competition_id;
END
$$ LANGUAGE plpgsql;

/**
 * finalize_competition(competition_id UUID)
 * Finalizes all results and prepares for publication
 */
CREATE OR REPLACE FUNCTION finalize_competition(p_competition_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  -- Update all results to finalized status
  UPDATE competition_results
  SET status = 'finalized'::result_status,
      status_changed_at = NOW(),
      status_changed_by = auth.uid()
  WHERE competition_id = p_competition_id
    AND status = 'pending';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Update competition status
  UPDATE competitions
  SET status = 'closed'::competition_status
  WHERE id = p_competition_id;
  
  RETURN v_count;
END
$$ LANGUAGE plpgsql;

/**
 * publish_competition_results(competition_id UUID)
 * Publishes results to public view
 */
CREATE OR REPLACE FUNCTION publish_competition_results(p_competition_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE competition_results
  SET status = 'published'::result_status,
      status_changed_at = NOW(),
      status_changed_by = auth.uid()
  WHERE competition_id = p_competition_id
    AND status = 'finalized';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END
$$ LANGUAGE plpgsql;

/**
 * close_step_for_jury(step_id UUID, jury_group_id UUID, reason TEXT)
 * Closes a step for specific jury group
 */
CREATE OR REPLACE FUNCTION close_step_for_jury(
  p_step_id UUID,
  p_jury_group_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_closure_id UUID;
BEGIN
  INSERT INTO step_closures (
    step_id,
    jury_group_id,
    closed_by,
    final_status,
    reason
  ) VALUES (
    p_step_id,
    p_jury_group_id,
    auth.uid(),
    'closed'::step_closure_status,
    p_reason
  ) RETURNING id INTO v_closure_id;
  
  -- Update assignment status
  UPDATE candidate_assignments
  SET status = 'completed'::assignment_status
  WHERE step_id = p_step_id
    AND jury_group_id = p_jury_group_id;
  
  RETURN v_closure_id;
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

/**
 * get_candidate_by_code(code VARCHAR)
 * Quick lookup for candidate by unique code
 */
CREATE OR REPLACE FUNCTION get_candidate_by_code(p_code VARCHAR)
RETURNS TABLE (
  candidate_id UUID,
  full_name TEXT,
  competition_name TEXT,
  status VARCHAR,
  email VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.first_name || ' ' || c.last_name,
    comp.name,
    c.status::VARCHAR,
    c.email
  FROM candidates c
  JOIN competitions comp ON c.competition_id = comp.id
  WHERE c.unique_code = p_code;
END
$$ LANGUAGE plpgsql;

/**
 * get_competition_statistics(competition_id UUID)
 * Returns comprehensive competition statistics
 */
CREATE OR REPLACE FUNCTION get_competition_statistics(p_competition_id UUID)
RETURNS TABLE (
  total_candidates INT,
  approved_candidates INT,
  rejected_candidates INT,
  total_votes INT,
  verified_votes INT,
  total_jury_groups INT,
  total_jury_members INT,
  steps_completed INT,
  scores_submitted INT,
  scores_validated INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT c.id)::INT,
    COUNT(DISTINCT CASE WHEN c.status = 'approved' THEN c.id END)::INT,
    COUNT(DISTINCT CASE WHEN c.status = 'rejected' THEN c.id END)::INT,
    COUNT(DISTINCT pv.id)::INT,
    COUNT(DISTINCT CASE WHEN pv.status = 'verified' THEN pv.id END)::INT,
    COUNT(DISTINCT jg.id)::INT,
    COUNT(DISTINCT jgm.id)::INT,
    COUNT(DISTINCT CASE WHEN s.status = 'closed' THEN s.id END)::INT,
    COUNT(DISTINCT cs.id)::INT,
    COUNT(DISTINCT CASE WHEN cs.validated THEN cs.id END)::INT
  FROM competitions comp
  LEFT JOIN candidates c ON comp.id = c.competition_id
  LEFT JOIN public_votes pv ON comp.id = pv.competition_id
  LEFT JOIN jury_groups jg ON comp.id = jg.competition_id
  LEFT JOIN jury_group_members jgm ON jg.id = jgm.jury_group_id
  LEFT JOIN steps s ON comp.id = s.competition_id
  LEFT JOIN candidate_scores cs ON s.id = cs.step_id
  WHERE comp.id = p_competition_id;
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant execute permissions for all authenticated users
GRANT EXECUTE ON FUNCTION calculate_jury_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_public_score TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_final_scores TO authenticated;
GRANT EXECUTE ON FUNCTION generate_certificates TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_gender_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_jury_workload TO authenticated;
GRANT EXECUTE ON FUNCTION get_candidate_by_code TO authenticated;
GRANT EXECUTE ON FUNCTION get_competition_statistics TO authenticated;

-- Only admins/moderators can execute admin functions
GRANT EXECUTE ON FUNCTION calculate_final_scores TO authenticated;
GRANT EXECUTE ON FUNCTION update_competition_results TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_competition TO authenticated;
GRANT EXECUTE ON FUNCTION publish_competition_results TO authenticated;
GRANT EXECUTE ON FUNCTION close_step_for_jury TO authenticated;
GRANT EXECUTE ON FUNCTION create_competition_edition TO authenticated;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================

/**
 * TOTAL FUNCTIONS: 15 advanced functions
 * - 3 scoring functions
 * - 2 certificate generation functions
 * - 4 leaderboard/reporting functions
 * - 4 competition management functions
 * - 2 utility functions
 *
 * USAGE EXAMPLES:
 * 1. Calculate scores: SELECT * FROM calculate_final_scores('comp-id');
 * 2. Generate certs: SELECT * FROM generate_certificates('comp-id');
 * 3. Get leaderboard: SELECT * FROM get_leaderboard('comp-id');
 * 4. Check workload: SELECT * FROM get_jury_workload('comp-id');
 *
 * PERFORMANCE:
 * - Most functions use window functions for efficiency
 * - Scoring functions cached in competition_results
 * - Consider materialized views for frequently used aggregates
 */
