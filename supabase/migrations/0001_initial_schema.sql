-- AWAC MONO - Migration 0001
-- Description: Initial schema with core entities and dynamic forms
-- Date: 2026-07-02
-- Version: 1.0

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. ENUMS (Types énumérés)
-- ============================================================================

-- Competition status
CREATE TYPE competition_status AS ENUM (
    'planning',
    'registrations',
    'in_progress',
    'closed'
);

-- Step status
CREATE TYPE step_status AS ENUM (
    'draft',
    'active',
    'closed'
);

-- Form type
CREATE TYPE form_type AS ENUM (
    'scoring',
    'feedback',
    'evaluation'
);

-- Field type (supports Google Forms-like fields)
CREATE TYPE field_type AS ENUM (
    'numeric',           -- Numerical score
    'slider',            -- Range slider
    'checkbox',          -- True/False
    'text_short',        -- Short text
    'text_long',         -- Long text (textarea)
    'suggestion'         -- Mandatory suggestion
);

-- ============================================================================
-- 3. COMPETITIONS TABLE
-- ============================================================================

CREATE TABLE competitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    description text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status competition_status NOT NULL DEFAULT 'planning',
    logo_url text,
    rules_document_url text,
    max_candidates integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid NOT NULL,
    
    -- Constraints
    CHECK (start_date IS NULL OR end_date IS NULL OR start_date < end_date),
    CHECK (max_candidates IS NULL OR max_candidates > 0)
);

-- Indexes on competitions
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_is_active ON competitions(is_active);
CREATE INDEX idx_competitions_created_by ON competitions(created_by);
CREATE INDEX idx_competitions_dates ON competitions(start_date, end_date);

-- ============================================================================
-- 4. STEPS TABLE
-- ============================================================================

CREATE TABLE steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    description text,
    step_order integer NOT NULL,
    percentage numeric(5, 2) NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status step_status NOT NULL DEFAULT 'draft',
    allows_dynamic_form boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(competition_id, step_order),
    CHECK (percentage >= 0 AND percentage <= 100),
    CHECK (start_date IS NULL OR end_date IS NULL OR start_date < end_date)
);

-- Indexes on steps
CREATE INDEX idx_steps_competition ON steps(competition_id);
CREATE INDEX idx_steps_status ON steps(status);
CREATE INDEX idx_steps_competition_order ON steps(competition_id, step_order);
CREATE INDEX idx_steps_dates ON steps(start_date, end_date);

-- ============================================================================
-- 5. FORMS TABLE
-- ============================================================================

CREATE TABLE forms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id uuid NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    description text,
    form_type form_type NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(step_id)
);

-- Indexes on forms
CREATE INDEX idx_forms_step ON forms(step_id);
CREATE INDEX idx_forms_type ON forms(form_type);
CREATE INDEX idx_forms_is_active ON forms(is_active);

-- ============================================================================
-- 6. FORM_FIELDS TABLE
-- ============================================================================

CREATE TABLE form_fields (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    field_name varchar(255) NOT NULL,
    field_type field_type NOT NULL,
    field_order integer NOT NULL,
    is_required boolean NOT NULL DEFAULT false,
    min_value numeric,
    max_value numeric,
    description text,
    placeholder varchar(255),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(form_id, field_order),
    CHECK (
        -- If numeric or slider type, min/max must be provided
        CASE 
            WHEN field_type IN ('numeric', 'slider') THEN min_value IS NOT NULL AND max_value IS NOT NULL
            ELSE true
        END
    ),
    CHECK (min_value IS NULL OR max_value IS NULL OR min_value < max_value)
);

-- Indexes on form_fields
CREATE INDEX idx_form_fields_form ON form_fields(form_id);
CREATE INDEX idx_form_fields_type ON form_fields(field_type);
CREATE INDEX idx_form_fields_order ON form_fields(form_id, field_order);

-- ============================================================================
-- 7. FIELD_OPTIONS TABLE
-- ============================================================================

CREATE TABLE field_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_field_id uuid NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
    option_label varchar(255) NOT NULL,
    option_value varchar(255) NOT NULL,
    option_order integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(form_field_id, option_order)
);

-- Indexes on field_options
CREATE INDEX idx_field_options_field ON field_options(form_field_id);
CREATE INDEX idx_field_options_order ON field_options(form_field_id, option_order);

-- ============================================================================
-- 8. VIEWS & HELPER FUNCTIONS
-- ============================================================================

-- View: Competition with step summary
CREATE VIEW competitions_with_steps AS
SELECT 
    c.id,
    c.name,
    c.status,
    COUNT(s.id) as total_steps,
    SUM(s.percentage) as total_percentage,
    c.created_at,
    c.updated_at
FROM competitions c
LEFT JOIN steps s ON c.id = s.competition_id
GROUP BY c.id, c.name, c.status, c.created_at, c.updated_at;

-- View: Forms with field count
CREATE VIEW forms_with_field_count AS
SELECT 
    f.id,
    f.step_id,
    f.name,
    f.form_type,
    COUNT(ff.id) as field_count,
    f.is_active,
    f.created_at
FROM forms f
LEFT JOIN form_fields ff ON f.id = ff.form_id
GROUP BY f.id, f.step_id, f.name, f.form_type, f.is_active, f.created_at;

-- ============================================================================
-- 9. FUNCTIONS FOR VALIDATION
-- ============================================================================

-- Function: Validate total step percentages = 100%
CREATE OR REPLACE FUNCTION validate_step_percentages()
RETURNS TRIGGER AS $$
DECLARE
    total_percentage numeric;
BEGIN
    SELECT SUM(percentage) INTO total_percentage
    FROM steps
    WHERE competition_id = COALESCE(NEW.competition_id, OLD.competition_id)
    AND id != COALESCE(NEW.id, OLD.id);
    
    total_percentage := COALESCE(total_percentage, 0) + COALESCE(NEW.percentage, 0);
    
    IF total_percentage > 100 THEN
        RAISE EXCEPTION 'Total step percentages cannot exceed 100%%. Current: %', total_percentage;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate percentages before insert/update
CREATE TRIGGER validate_percentages_trigger
BEFORE INSERT OR UPDATE ON steps
FOR EACH ROW
EXECUTE FUNCTION validate_step_percentages();

-- ============================================================================
-- 10. UPDATE TIMESTAMPS FUNCTION
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: Update timestamps on tables with updated_at
CREATE TRIGGER competitions_updated_at_trigger
BEFORE UPDATE ON competitions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER steps_updated_at_trigger
BEFORE UPDATE ON steps
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER forms_updated_at_trigger
BEFORE UPDATE ON forms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_options ENABLE ROW LEVEL SECURITY;

-- Default policies (allow all for now, will be restricted in 0002_rls_policies.sql)
CREATE POLICY "competitions_all_access" ON competitions USING (true);
CREATE POLICY "steps_all_access" ON steps USING (true);
CREATE POLICY "forms_all_access" ON forms USING (true);
CREATE POLICY "form_fields_all_access" ON form_fields USING (true);
CREATE POLICY "field_options_all_access" ON field_options USING (true);

-- ============================================================================
-- 12. COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE competitions IS 'Main competition events for the AWAC MONO platform';
COMMENT ON COLUMN competitions.status IS 'Competition lifecycle: planning, registrations, in_progress, closed';

COMMENT ON TABLE steps IS 'Evaluation steps within a competition';
COMMENT ON COLUMN steps.percentage IS 'Weight of this step in final score (0-100, sum must be 100%)';
COMMENT ON COLUMN steps.allows_dynamic_form IS 'Whether this step uses dynamic form fields';

COMMENT ON TABLE forms IS 'Dynamic forms for each step (Google Forms-like)';
COMMENT ON COLUMN forms.form_type IS 'Type: scoring (numerical), feedback (comments), evaluation (mixed)';

COMMENT ON TABLE form_fields IS 'Individual fields within a form';
COMMENT ON COLUMN form_fields.field_type IS 'Field type: numeric, slider, checkbox, text_short, text_long, suggestion';
COMMENT ON COLUMN form_fields.min_value IS 'Minimum value for numeric/slider fields';
COMMENT ON COLUMN form_fields.max_value IS 'Maximum value for numeric/slider fields';

COMMENT ON TABLE field_options IS 'Options for checkbox, dropdown, or selection fields';
COMMENT ON COLUMN field_options.option_value IS 'Internal value stored in responses';
COMMENT ON COLUMN field_options.option_label IS 'Human-readable label displayed to users';

-- ============================================================================
-- 13. GRANTS (Initial setup - modify as needed)
-- ============================================================================

-- Grant basic permissions to anonymous users (for reading public info)
GRANT SELECT ON competitions TO anon;
GRANT SELECT ON steps TO anon;
GRANT SELECT ON forms TO anon;
GRANT SELECT ON form_fields TO anon;
GRANT SELECT ON field_options TO anon;

-- Grant to authenticated users (will be refined in RLS policies)
GRANT SELECT, INSERT, UPDATE ON competitions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON steps TO authenticated;
GRANT SELECT, INSERT, UPDATE ON forms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON form_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE ON field_options TO authenticated;

-- ============================================================================
-- END OF MIGRATION 0001
-- ============================================================================
-- Next migrations:
--   0002_rls_policies.sql - Comprehensive RLS policies by role
--   0003_candidates_jury.sql - Candidates and jury management tables
--   0004_scoring_tables.sql - Scoring and evaluation tables
--   0005_results_certificates.sql - Results and certificate tables
--   0006_audit_triggers.sql - Audit logging and advanced triggers
