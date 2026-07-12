-- =============================================================================
-- AWAC MONO - Migration 0009: Cache, Logging & Status Management
-- =============================================================================
-- Tables:
--   1. dashboard_cache: Pre-computed dashboard data for performance
--   2. competition_status_logs: History of competition status changes
--   3. step_closures: Track when steps are closed/reopened with reasons
--
-- Features:
--   - Pre-computed cache for dashboard performance
--   - TTL-based cache invalidation
--   - Complete status history for each competition
--   - Step closure tracking with reopen support
--   - Reason tracking for compliance and audit
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE cache_key_type AS ENUM (
  'competition_summary',
  'candidate_statistics',
  'scoring_summary',
  'results_summary',
  'jury_workload',
  'vote_statistics'
);

CREATE TYPE step_closure_status AS ENUM (
  'closed',
  'reopened'
);

-- =============================================================================
-- TABLES
-- =============================================================================

/**
 * dashboard_cache: Pre-computed aggregated data for dashboard
 * - Avoids expensive joins on every dashboard load
 * - Stores JSON data for flexibility
 * - TTL (expires_at) for automatic invalidation
 * - Tracks who generated the cache
 */
CREATE TABLE dashboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID,
  
  -- Cache content
  cache_key VARCHAR(100) NOT NULL,
  cache_data JSONB NOT NULL,
  
  -- TTL and lifecycle
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT fk_cache_competition FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_cache_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT cache_key_not_empty CHECK (LENGTH(TRIM(cache_key)) > 0)
);

-- Enable RLS
ALTER TABLE dashboard_cache ENABLE ROW LEVEL SECURITY;

/**
 * competition_status_logs: Track all competition status transitions
 * - Audit trail of status changes
 * - Reason tracking for workflow compliance
 * - Who made each change and when
 * - Used for competition lifecycle management
 */
CREATE TABLE competition_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL,
  
  -- Status transition
  old_status competition_status,
  new_status competition_status NOT NULL,
  
  -- Change tracking
  changed_by UUID NOT NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_status_log_competition FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_status_log_changed_by FOREIGN KEY (changed_by) REFERENCES profiles(id) ON DELETE RESTRICT
);

-- Enable RLS
ALTER TABLE competition_status_logs ENABLE ROW LEVEL SECURITY;

/**
 * step_closures: Track when steps are closed or reopened
 * - Closure status (closed/reopened)
 * - Optional jury_group (closure per group or global)
 * - Reason for closure (e.g., "Jury group completed evaluation")
 * - Tracks who performed the action
 */
CREATE TABLE step_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL,
  jury_group_id UUID,
  
  -- Closure action
  closed_by UUID NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status and reason
  final_status step_closure_status NOT NULL DEFAULT 'closed',
  reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_closure_step FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE,
  CONSTRAINT fk_closure_jury_group FOREIGN KEY (jury_group_id) REFERENCES jury_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_closure_closed_by FOREIGN KEY (closed_by) REFERENCES profiles(id) ON DELETE RESTRICT
);

-- Enable RLS
ALTER TABLE step_closures ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- dashboard_cache indexes
CREATE INDEX idx_cache_competition_id ON dashboard_cache(competition_id);
CREATE INDEX idx_cache_key ON dashboard_cache(cache_key);
CREATE INDEX idx_cache_expires_at ON dashboard_cache(expires_at);
CREATE INDEX idx_cache_created_at ON dashboard_cache(created_at DESC);
CREATE INDEX idx_cache_competition_key ON dashboard_cache(competition_id, cache_key);

-- competition_status_logs indexes
CREATE INDEX idx_status_log_competition_id ON competition_status_logs(competition_id);
CREATE INDEX idx_status_log_new_status ON competition_status_logs(new_status);
CREATE INDEX idx_status_log_changed_by ON competition_status_logs(changed_by);
CREATE INDEX idx_status_log_changed_at ON competition_status_logs(changed_at DESC);
CREATE INDEX idx_status_log_competition_changed_at ON competition_status_logs(competition_id, changed_at DESC);

-- step_closures indexes
CREATE INDEX idx_closure_step_id ON step_closures(step_id);
CREATE INDEX idx_closure_jury_group_id ON step_closures(jury_group_id);
CREATE INDEX idx_closure_closed_by ON step_closures(closed_by);
CREATE INDEX idx_closure_status ON step_closures(final_status);
CREATE INDEX idx_closure_closed_at ON step_closures(closed_at DESC);
CREATE INDEX idx_closure_step_jury ON step_closures(step_id, jury_group_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

/**
 * invalidate_cache(): Remove expired cache entries
 * Called periodically or before regenerating cache
 */
CREATE OR REPLACE FUNCTION invalidate_cache(p_cache_key VARCHAR DEFAULT NULL)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM dashboard_cache
  WHERE (p_cache_key IS NULL OR cache_key = p_cache_key)
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$$ LANGUAGE plpgsql;

/**
 * get_cached_data(): Retrieve valid cache entry if exists
 * Returns NULL if no valid cache exists
 */
CREATE OR REPLACE FUNCTION get_cached_data(
  p_cache_key VARCHAR,
  p_competition_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT cache_data
    FROM dashboard_cache
    WHERE cache_key = p_cache_key
      AND (p_competition_id IS NULL OR competition_id = p_competition_id)
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  );
END
$$ LANGUAGE plpgsql;

/**
 * log_status_change(): Record competition status change
 */
CREATE OR REPLACE FUNCTION log_status_change(
  p_competition_id UUID,
  p_new_status competition_status,
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_old_status competition_status;
  v_log_id UUID;
BEGIN
  SELECT status INTO v_old_status FROM competitions WHERE id = p_competition_id;
  
  INSERT INTO competition_status_logs (
    competition_id,
    old_status,
    new_status,
    changed_by,
    reason
  ) VALUES (
    p_competition_id,
    v_old_status,
    p_new_status,
    p_changed_by,
    p_reason
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END
$$ LANGUAGE plpgsql;

/**
 * close_step(): Mark step as closed
 */
CREATE OR REPLACE FUNCTION close_step(
  p_step_id UUID,
  p_jury_group_id UUID DEFAULT NULL,
  p_closed_by UUID DEFAULT NULL,
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
    COALESCE(p_closed_by, auth.uid()),
    'closed',
    p_reason
  ) RETURNING id INTO v_closure_id;
  
  RETURN v_closure_id;
END
$$ LANGUAGE plpgsql;

/**
 * reopen_step(): Reopen a previously closed step
 */
CREATE OR REPLACE FUNCTION reopen_step(
  p_closure_id UUID,
  p_reopened_by UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_closure_id UUID;
BEGIN
  INSERT INTO step_closures (
    step_id,
    jury_group_id,
    closed_by,
    final_status,
    reason
  ) SELECT
    step_id,
    jury_group_id,
    COALESCE(p_reopened_by, auth.uid()),
    'reopened',
    p_reason
  FROM step_closures
  WHERE id = p_closure_id
  RETURNING id INTO v_new_closure_id;
  
  RETURN v_new_closure_id;
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at on step_closures
CREATE TRIGGER update_step_closures_updated_at
BEFORE UPDATE ON step_closures
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Audit: Log status changes
CREATE OR REPLACE FUNCTION audit_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM log_audit(
      auth.uid(),
      'update'::audit_action,
      'competitions',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      NEW.id
    );
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_competition_status
AFTER UPDATE ON competitions
FOR EACH ROW
EXECUTE FUNCTION audit_status_change();

-- Audit: Log step closures
CREATE OR REPLACE FUNCTION audit_step_closure()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_audit(
    NEW.closed_by,
    CASE WHEN NEW.final_status = 'closed' THEN 'update' ELSE 'update' END::audit_action,
    'steps',
    NEW.step_id,
    jsonb_build_object(
      'closure_status', NEW.final_status,
      'reason', NEW.reason
    )
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_step_closure
AFTER INSERT ON step_closures
FOR EACH ROW
EXECUTE FUNCTION audit_step_closure();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- =====================================================================
-- DASHBOARD_CACHE TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY cache_admin_all ON dashboard_cache
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access (manage cache)
CREATE POLICY cache_moderator_all ON dashboard_cache
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury: Read only
CREATE POLICY cache_jury_select ON dashboard_cache
  FOR SELECT USING (get_user_role() IN ('jury_president', 'jury_member'));

-- Prevent jury from writing
CREATE POLICY cache_jury_no_write ON dashboard_cache
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY cache_jury_no_delete ON dashboard_cache
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =====================================================================
-- COMPETITION_STATUS_LOGS TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY status_log_admin_all ON competition_status_logs
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY status_log_moderator_all ON competition_status_logs
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury: Read only
CREATE POLICY status_log_jury_select ON competition_status_logs
  FOR SELECT USING (get_user_role() IN ('jury_president', 'jury_member'));

-- Prevent jury from writing
CREATE POLICY status_log_jury_no_write ON competition_status_logs
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY status_log_jury_no_delete ON competition_status_logs
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =====================================================================
-- STEP_CLOSURES TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY closure_admin_all ON step_closures
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access (close/reopen steps)
CREATE POLICY closure_moderator_all ON step_closures
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury president: Can close steps for their groups
CREATE POLICY closure_president_insert ON step_closures
  FOR INSERT WITH CHECK (
    get_user_role() = 'jury_president'
    AND closed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM jury_groups
      WHERE id = step_closures.jury_group_id
        AND president_id = auth.uid()
    )
  );

CREATE POLICY closure_president_select ON step_closures
  FOR SELECT USING (
    get_user_role() = 'jury_president'
    AND EXISTS (
      SELECT 1 FROM jury_groups
      WHERE id = step_closures.jury_group_id
        AND president_id = auth.uid()
    )
  );

-- Prevent jury member from writing
CREATE POLICY closure_jury_no_write ON step_closures
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY closure_jury_no_delete ON step_closures
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =============================================================================
-- VIEWS
-- =============================================================================

/**
 * competition_status_history: Full status transition history per competition
 * Used for compliance audit trail
 */
CREATE OR REPLACE VIEW competition_status_history AS
SELECT 
  c.id,
  c.name AS competition_name,
  csl.id AS log_id,
  csl.old_status,
  csl.new_status,
  p.full_name AS changed_by_name,
  csl.reason,
  csl.changed_at,
  LAG(csl.changed_at) OVER (
    PARTITION BY c.id ORDER BY csl.changed_at
  ) AS previous_change_at
FROM competitions c
JOIN competition_status_logs csl ON c.id = csl.competition_id
LEFT JOIN profiles p ON csl.changed_by = p.id
ORDER BY c.id, csl.changed_at DESC;

/**
 * step_closure_history: Timeline of step closures and reopenings
 * Used for step lifecycle tracking
 */
CREATE OR REPLACE VIEW step_closure_history AS
SELECT 
  s.id AS step_id,
  s.name AS step_name,
  c.id AS competition_id,
  c.name AS competition_name,
  jg.name AS jury_group_name,
  sc.final_status,
  p.full_name AS closed_by_name,
  sc.reason,
  sc.closed_at,
  COUNT(*) OVER (PARTITION BY s.id) AS total_closures
FROM step_closures sc
JOIN steps s ON sc.step_id = s.id
JOIN competitions c ON s.competition_id = c.id
LEFT JOIN jury_groups jg ON sc.jury_group_id = jg.id
LEFT JOIN profiles p ON sc.closed_by = p.id
ORDER BY sc.closed_at DESC;

/**
 * cache_statistics: Cache usage and performance data
 * Used for monitoring cache effectiveness
 */
CREATE OR REPLACE VIEW cache_statistics AS
SELECT 
  cache_key,
  COUNT(DISTINCT id) AS total_entries,
  COUNT(DISTINCT CASE WHEN expires_at > NOW() THEN id END) AS valid_entries,
  COUNT(DISTINCT CASE WHEN expires_at <= NOW() THEN id END) AS expired_entries,
  COUNT(DISTINCT competition_id) AS competitions_cached,
  MAX(created_at) AS latest_cache_at
FROM dashboard_cache
GROUP BY cache_key;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON dashboard_cache TO authenticated;
GRANT SELECT ON competition_status_logs TO authenticated;
GRANT SELECT, INSERT ON step_closures TO authenticated;

-- Grant views to authenticated
GRANT SELECT ON competition_status_history TO authenticated;
GRANT SELECT ON step_closure_history TO authenticated;
GRANT SELECT ON cache_statistics TO authenticated;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================

/**
 * MIGRATION FLOW:
 * 1. Create ENUM types for cache keys and closure status
 * 2. Create dashboard_cache table with TTL
 * 3. Create competition_status_logs table
 * 4. Create step_closures table
 * 5. Create cache management functions
 * 6. Create status/closure logging functions
 * 7. Create triggers for automatic audit logging
 * 8. Apply RLS policies
 * 9. Create views for history and monitoring
 *
 * TESTING CHECKLIST:
 * □ Create cache entries with expiry
 * □ Retrieve valid cache (not expired)
 * □ Verify expired cache not retrieved
 * □ Invalidate cache by key
 * □ Change competition status and verify log
 * □ Close step and verify closure log
 * □ Reopen closed step
 * □ Verify status transition audit
 * □ Check view aggregations
 * □ Test RLS: jury_president can close own group steps
 * □ Test RLS: cache deleted when expired
 * 
 * DEPENDENCIES:
 * - Requires: migrations 0001-0008
 * - Changes: Creates 3 new tables + 3 views
 * - Breaking: None
 * 
 * NOTES:
 * - Cache entries must have explicit TTL (expires_at)
 * - Cache key types: competition_summary, scoring_summary, etc.
 * - Status logs track old → new status transitions
 * - Step closures can be per-jury_group (group completes early)
 * - Reopen creates new entry (audit trail of reopens)
 * - Cache invalidation should run periodically (background job)
 * 
 * PERFORMANCE:
 * - Periodic job: DELETE FROM dashboard_cache WHERE expires_at < NOW();
 * - Can be run via pg_cron or application scheduler
 */
