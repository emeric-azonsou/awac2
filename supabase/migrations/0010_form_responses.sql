-- =============================================================================
-- AWAC MONO - Migration 0010: Form Responses & Dynamic Data Collection
-- =============================================================================
-- Tables:
--   1. form_responses: Individual form submissions per candidate/assignment
--   2. form_response_values: Field-level responses (one row per field)
--
-- Features:
--   - Captures responses to dynamic forms
--   - Flexible value storage (text, numeric, choices)
--   - Links to form assignments and field options
--   - Completion tracking
--   - Multi-type field support (text, numeric, slider, checkbox, etc.)
--   - Full audit trail
-- =============================================================================

-- =============================================================================
-- TABLES
-- =============================================================================

/**
 * form_responses: Collection of form responses per candidate
 * - One response per form per candidate assignment
 * - Tracks submission timestamp and completion status
 * - Links to specific candidate assignment
 * - Used for tracking which forms were completed
 */
CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL,
  candidate_assignment_id UUID NOT NULL,
  submitted_by UUID NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_completed BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_response_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
  CONSTRAINT fk_response_assignment FOREIGN KEY (candidate_assignment_id) REFERENCES candidate_assignments(id) ON DELETE CASCADE,
  CONSTRAINT fk_response_submitted_by FOREIGN KEY (submitted_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT unique_form_response UNIQUE (form_id, candidate_assignment_id)
);

-- Enable RLS
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

/**
 * form_response_values: Individual field responses within a form
 * - One row per form field per form response
 * - Supports multiple value types: text, numeric, select
 * - Optional field_option_id for choice-type fields
 * - Flexible value storage for different data types
 */
CREATE TABLE form_response_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_response_id UUID NOT NULL,
  form_field_id UUID NOT NULL,
  field_option_id UUID,
  
  -- Multi-type value storage
  value TEXT,                    -- Raw value (text/display)
  numeric_value NUMERIC(15, 2),  -- Numeric values (slider, number)
  text_value TEXT,               -- Long text storage
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_response_value_response FOREIGN KEY (form_response_id) REFERENCES form_responses(id) ON DELETE CASCADE,
  CONSTRAINT fk_response_value_field FOREIGN KEY (form_field_id) REFERENCES form_fields(id) ON DELETE RESTRICT,
  CONSTRAINT fk_response_value_option FOREIGN KEY (field_option_id) REFERENCES field_options(id) ON DELETE SET NULL,
  CONSTRAINT unique_response_field UNIQUE (form_response_id, form_field_id),
  CONSTRAINT at_least_one_value CHECK (
    value IS NOT NULL 
    OR numeric_value IS NOT NULL 
    OR text_value IS NOT NULL 
    OR field_option_id IS NOT NULL
  )
);

-- Enable RLS
ALTER TABLE form_response_values ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- form_responses indexes
CREATE INDEX idx_response_form_id ON form_responses(form_id);
CREATE INDEX idx_response_assignment_id ON form_responses(candidate_assignment_id);
CREATE INDEX idx_response_submitted_by ON form_responses(submitted_by);
CREATE INDEX idx_response_submitted_at ON form_responses(submitted_at DESC);
CREATE INDEX idx_response_is_completed ON form_responses(is_completed);
CREATE INDEX idx_response_form_assignment ON form_responses(form_id, candidate_assignment_id);

-- form_response_values indexes
CREATE INDEX idx_response_value_response_id ON form_response_values(form_response_id);
CREATE INDEX idx_response_value_field_id ON form_response_values(form_field_id);
CREATE INDEX idx_response_value_option_id ON form_response_values(field_option_id);
CREATE INDEX idx_response_value_numeric ON form_response_values(numeric_value);
CREATE INDEX idx_response_value_response_field ON form_response_values(form_response_id, form_field_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

/**
 * validate_form_response_values(): Ensure required fields are answered
 * Checks that all mandatory form fields have values
 */
CREATE OR REPLACE FUNCTION validate_form_response_values(p_form_response_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if all required fields have responses
  RETURN NOT EXISTS (
    SELECT 1 FROM form_fields ff
    WHERE ff.form_id = (
      SELECT form_id FROM form_responses WHERE id = p_form_response_id
    )
    AND ff.is_required = true
    AND NOT EXISTS (
      SELECT 1 FROM form_response_values
      WHERE form_response_id = p_form_response_id
        AND form_field_id = ff.id
        AND (value IS NOT NULL OR numeric_value IS NOT NULL OR text_value IS NOT NULL OR field_option_id IS NOT NULL)
    )
  );
END
$$ LANGUAGE plpgsql;

/**
 * get_form_response_summary(): Get aggregated response data for form
 * Returns count of responses, completion rate, etc.
 */
CREATE OR REPLACE FUNCTION get_form_response_summary(p_form_id UUID)
RETURNS TABLE (
  total_responses INT,
  completed_responses INT,
  completion_rate NUMERIC,
  average_submission_seconds INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT fr.id)::INT AS total_responses,
    COUNT(DISTINCT CASE WHEN fr.is_completed THEN fr.id END)::INT AS completed_responses,
    ROUND(
      COUNT(DISTINCT CASE WHEN fr.is_completed THEN fr.id END)::NUMERIC / 
      NULLIF(COUNT(DISTINCT fr.id), 0) * 100,
      2
    ) AS completion_rate,
    ROUND(AVG(EXTRACT(EPOCH FROM (fr.updated_at - fr.created_at))))::INT AS average_submission_seconds
  FROM form_responses fr
  WHERE fr.form_id = p_form_id;
END
$$ LANGUAGE plpgsql;

/**
 * export_form_responses(): Export form responses as aggregated data
 * Used for analysis and reporting
 */
CREATE OR REPLACE FUNCTION export_form_responses(
  p_form_id UUID,
  p_competition_id UUID DEFAULT NULL
)
RETURNS TABLE (
  candidate_name TEXT,
  field_name VARCHAR,
  label VARCHAR,
  field_type field_type,
  response_value TEXT,
  submitted_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CONCAT(cand.first_name, ' ', cand.last_name) AS candidate_name,
    ff.field_name,
    ff.field_name,
    ff.field_type,
    COALESCE(
      frv.value,
      frv.numeric_value::TEXT,
      frv.text_value,
      fo.option_label
    ) AS response_value,
    fr.submitted_at
  FROM form_responses fr
  JOIN form_fields ff ON fr.form_id = ff.form_id
  LEFT JOIN form_response_values frv ON ff.id = frv.form_field_id 
    AND fr.id = frv.form_response_id
  LEFT JOIN field_options fo ON frv.field_option_id = fo.id
  JOIN candidate_assignments ca ON fr.candidate_assignment_id = ca.id
  JOIN candidates cand ON ca.candidate_id = cand.id
  WHERE fr.form_id = p_form_id
    AND (p_competition_id IS NULL OR cand.competition_id = p_competition_id)
  ORDER BY cand.last_name, ff.field_order, fr.submitted_at;
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at on form_responses
CREATE TRIGGER update_form_responses_updated_at
BEFORE UPDATE ON form_responses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on form_response_values
CREATE TRIGGER update_form_response_values_updated_at
BEFORE UPDATE ON form_response_values
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Validate form responses on insert
CREATE OR REPLACE FUNCTION validate_form_response_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed AND NOT validate_form_response_values(NEW.id) THEN
    RAISE EXCEPTION 'Form has required fields with no responses';
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_form_response_completeness
BEFORE INSERT OR UPDATE ON form_responses
FOR EACH ROW
WHEN (NEW.is_completed = true)
EXECUTE FUNCTION validate_form_response_on_insert();

-- Validate response value types
CREATE OR REPLACE FUNCTION validate_response_value_type()
RETURNS TRIGGER AS $$
DECLARE
  v_field_type field_type;
BEGIN
  SELECT ff.field_type INTO v_field_type
  FROM form_fields ff
  WHERE ff.id = NEW.form_field_id;
  
  -- Numeric fields should have numeric_value
  IF v_field_type IN ('numeric', 'slider') AND NEW.numeric_value IS NULL THEN
    RAISE EXCEPTION 'Numeric field requires numeric_value';
  END IF;
  
  -- Choice fields should have field_option_id
  IF v_field_type IN ('checkbox', 'select') AND NEW.field_option_id IS NULL THEN
    RAISE EXCEPTION 'Choice field requires field_option_id';
  END IF;
  
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_response_type
BEFORE INSERT OR UPDATE ON form_response_values
FOR EACH ROW
EXECUTE FUNCTION validate_response_value_type();

-- Audit: Log form submissions
CREATE OR REPLACE FUNCTION audit_form_submission()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_audit(
    NEW.submitted_by,
    'create'::audit_action,
    'form_responses',
    NEW.id,
    jsonb_build_object(
      'form_id', NEW.form_id,
      'is_completed', NEW.is_completed
    ),
    (SELECT competition_id FROM candidate_assignments ca WHERE ca.id = NEW.candidate_assignment_id)
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_form_submission_created
AFTER INSERT ON form_responses
FOR EACH ROW
EXECUTE FUNCTION audit_form_submission();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- =====================================================================
-- FORM_RESPONSES TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY form_resp_admin_all ON form_responses
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access (review/export)
CREATE POLICY form_resp_moderator_all ON form_responses
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury president: Can submit forms for their groups
CREATE POLICY form_resp_president_insert ON form_responses
  FOR INSERT WITH CHECK (
    get_user_role() = 'jury_president'
    AND submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM candidate_assignments ca
      WHERE ca.id = form_responses.candidate_assignment_id
        AND EXISTS (
          SELECT 1 FROM jury_groups
          WHERE id = ca.jury_group_id
            AND president_id = auth.uid()
        )
    )
  );

CREATE POLICY form_resp_president_select ON form_responses
  FOR SELECT USING (
    get_user_role() = 'jury_president'
    AND EXISTS (
      SELECT 1 FROM candidate_assignments ca
      WHERE ca.id = form_responses.candidate_assignment_id
        AND EXISTS (
          SELECT 1 FROM jury_groups
          WHERE id = ca.jury_group_id
            AND president_id = auth.uid()
        )
    )
  );

-- Jury member: Can submit forms for their group assignments
CREATE POLICY form_resp_member_insert ON form_responses
  FOR INSERT WITH CHECK (
    get_user_role() = 'jury_member'
    AND submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM candidate_assignments ca
      WHERE ca.id = form_responses.candidate_assignment_id
        AND EXISTS (
          SELECT 1 FROM jury_group_members
          WHERE jury_group_id = ca.jury_group_id
            AND profile_id = auth.uid()
            AND is_active = true
        )
    )
  );

CREATE POLICY form_resp_member_select ON form_responses
  FOR SELECT USING (
    get_user_role() = 'jury_member'
    AND submitted_by = auth.uid()
  );

-- Prevent jury from deleting
CREATE POLICY form_resp_jury_no_delete ON form_responses
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =====================================================================
-- FORM_RESPONSE_VALUES TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY form_values_admin_all ON form_response_values
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY form_values_moderator_all ON form_response_values
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury president: Can insert values for their group responses
CREATE POLICY form_values_president_insert ON form_response_values
  FOR INSERT WITH CHECK (
    get_user_role() = 'jury_president'
    AND EXISTS (
      SELECT 1 FROM form_responses fr
      WHERE fr.id = form_response_values.form_response_id
        AND fr.submitted_by = auth.uid()
    )
  );

CREATE POLICY form_values_president_select ON form_response_values
  FOR SELECT USING (
    get_user_role() = 'jury_president'
    AND EXISTS (
      SELECT 1 FROM form_responses fr
      WHERE fr.id = form_response_values.form_response_id
        AND fr.submitted_by = auth.uid()
    )
  );

-- Jury member: Can insert values for own responses
CREATE POLICY form_values_member_insert ON form_response_values
  FOR INSERT WITH CHECK (
    get_user_role() = 'jury_member'
    AND EXISTS (
      SELECT 1 FROM form_responses fr
      WHERE fr.id = form_response_values.form_response_id
        AND fr.submitted_by = auth.uid()
    )
  );

CREATE POLICY form_values_member_select ON form_response_values
  FOR SELECT USING (
    get_user_role() = 'jury_member'
    AND EXISTS (
      SELECT 1 FROM form_responses fr
      WHERE fr.id = form_response_values.form_response_id
        AND fr.submitted_by = auth.uid()
    )
  );

-- Prevent jury from deleting
CREATE POLICY form_values_jury_no_delete ON form_response_values
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =============================================================================
-- VIEWS
-- =============================================================================

/**
 * form_completion_status: Track form submission and completion progress
 * Shows per-form submission statistics
 */
CREATE OR REPLACE VIEW form_completion_status AS
SELECT 
  f.id,
  f.name,
  s.name AS step_name,
  c.name AS competition_name,
  COUNT(DISTINCT fr.id) AS total_responses,
  COUNT(DISTINCT CASE WHEN fr.is_completed THEN fr.id END) AS completed_responses,
  ROUND(
    COUNT(DISTINCT CASE WHEN fr.is_completed THEN fr.id END)::NUMERIC / 
    NULLIF(COUNT(DISTINCT fr.id), 0) * 100,
    2
  ) AS completion_percentage,
  MAX(fr.submitted_at) AS latest_submission,
  COUNT(DISTINCT CASE WHEN ff.is_required THEN ff.id END) AS required_fields,
  COUNT(DISTINCT ff.id) AS total_fields
FROM forms f
JOIN steps s ON f.step_id = s.id
JOIN competitions c ON s.competition_id = c.id
LEFT JOIN form_responses fr ON f.id = fr.form_id
LEFT JOIN form_fields ff ON f.id = ff.form_id
GROUP BY f.id, s.id, c.id;

/**
 * form_field_response_summary: Aggregated response data per field
 * Shows most common responses and statistics
 */
CREATE OR REPLACE VIEW form_field_response_summary AS
SELECT 
  f.name,
  ff.field_name,
  ff.field_type,
  COUNT(DISTINCT frv.id) AS response_count,
  COUNT(DISTINCT CASE WHEN frv.value IS NOT NULL THEN frv.id END) AS text_responses,
  COUNT(DISTINCT CASE WHEN frv.numeric_value IS NOT NULL THEN frv.id END) AS numeric_responses,
  AVG(frv.numeric_value) AS average_numeric_value,
  MIN(frv.numeric_value) AS min_value,
  MAX(frv.numeric_value) AS max_value,
  COUNT(DISTINCT CASE WHEN ff.is_required THEN frv.id END) AS required_field_responses
FROM form_fields ff
JOIN forms f ON ff.form_id = f.id
LEFT JOIN form_response_values frv ON ff.id = frv.form_field_id
GROUP BY f.id, ff.id
ORDER BY f.name, ff.field_order;

/**
 * candidate_form_submission_timeline: When each candidate submitted forms
 * Useful for submission deadline tracking
 */
CREATE OR REPLACE VIEW candidate_form_submission_timeline AS
SELECT 
  cand.id AS candidate_id,
  cand.first_name || ' ' || cand.last_name AS candidate_name,
  f.name,
  s.name AS step_name,
  fr.submitted_at,
  fr.is_completed,
  (fr.updated_at - fr.created_at) AS submission_duration
FROM form_responses fr
JOIN candidate_assignments ca ON fr.candidate_assignment_id = ca.id
JOIN candidates cand ON ca.candidate_id = cand.id
JOIN forms f ON fr.form_id = f.id
JOIN steps s ON f.step_id = s.id
ORDER BY cand.id, s.step_order, fr.submitted_at DESC;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT ON form_responses TO authenticated;
GRANT SELECT, INSERT ON form_response_values TO authenticated;

-- Grant views to authenticated
GRANT SELECT ON form_completion_status TO authenticated;
GRANT SELECT ON form_field_response_summary TO authenticated;
GRANT SELECT ON candidate_form_submission_timeline TO authenticated;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================

/**
 * MIGRATION FLOW:
 * 1. Create form_responses table
 * 2. Create form_response_values table with multi-type storage
 * 3. Create validation functions (required fields, value types)
 * 4. Create export function for reporting
 * 5. Create triggers for validation and audit logging
 * 6. Apply RLS policies (jury can only submit/view own)
 * 7. Create views for completion tracking
 *
 * TESTING CHECKLIST:
 * □ Create form response with all field types
 * □ Test required field validation
 * □ Store text responses in value field
 * □ Store numeric responses in numeric_value
 * □ Store choice responses with field_option_id
 * □ Test completion status tracking
 * □ Verify RLS: jury_member can only submit for own group
 * □ Export responses for analysis
 * □ Check view aggregations (completion %, field stats)
 * □ Verify audit logs created for submissions
 * □ Test form response uniqueness (form + assignment)
 * 
 * DEPENDENCIES:
 * - Requires: migrations 0001-0009
 * - Changes: Creates 2 new tables + 3 views
 * - Breaking: None
 * 
 * NOTES:
 * - Supports multi-type value storage (text, numeric, choice)
 * - Field validation based on field_type (ENUM)
 * - Completion tracking for submission status
 * - Export function for data analysis/reporting
 * - RLS ensures jury can only see/submit own forms
 * - Audit logs track all form submissions
 * - Views provide completion statistics and field analysis
 * 
 * PERFORMANCE:
 * - Consider indexing on (form_id, submitted_at) for time-based queries
 * - Export function uses JOINs, may need pagination for large datasets
 */
