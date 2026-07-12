-- AWAC MONO - Migration 0003
-- Description: Candidates and candidate photos management
-- Date: 2026-07-02
-- Version: 1.0
-- Depends on: 0001_initial_schema.sql, 0002_rls_policies.sql

-- ============================================================================
-- 1. ENUMS (Types énumérés)
-- ============================================================================

-- Gender enum
CREATE TYPE gender AS ENUM (
    'male',
    'female',
    'other'
);

-- Candidate status
CREATE TYPE candidate_status AS ENUM (
    'registered',      -- Just registered, not yet reviewed
    'approved',        -- Approved to participate
    'rejected',        -- Rejected application
    'withdrawn',       -- Candidate withdrew
    'disqualified'     -- Disqualified during competition
);

-- Photo type
CREATE TYPE photo_type AS ENUM (
    'profile',         -- Profile/passport photo
    'creation'         -- Photo of the creation/garment
);

-- ============================================================================
-- 2. CANDIDATES TABLE
-- ============================================================================

CREATE TABLE candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    
    -- Personal information
    first_name varchar(255) NOT NULL,
    last_name varchar(255) NOT NULL,
    email varchar(255),
    phone varchar(20),
    
    -- Unique identifier (format: AWAC-YYYY-XXXX)
    unique_code varchar(50) NOT NULL,
    
    -- Demographics
    gender gender NOT NULL,
    category varchar(100) NOT NULL,
    workshop_name varchar(255) NOT NULL,
    commune varchar(255),
    
    -- Participation info
    registration_date timestamp with time zone NOT NULL DEFAULT now(),
    status candidate_status NOT NULL DEFAULT 'registered',
    disqualified boolean NOT NULL DEFAULT false,
    
    -- Metadata
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(competition_id, unique_code),
    UNIQUE(competition_id, email),
    CHECK (first_name IS NOT NULL AND first_name != ''),
    CHECK (last_name IS NOT NULL AND last_name != ''),
    CHECK (unique_code IS NOT NULL AND unique_code != '')
);

-- Indexes on candidates
CREATE INDEX idx_candidates_competition ON candidates(competition_id);
CREATE INDEX idx_candidates_unique_code ON candidates(competition_id, unique_code);
CREATE INDEX idx_candidates_email ON candidates(competition_id, email);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_gender ON candidates(gender);
CREATE INDEX idx_candidates_category ON candidates(category);
CREATE INDEX idx_candidates_registration_date ON candidates(registration_date DESC);
CREATE INDEX idx_candidates_disqualified ON candidates(disqualified);

-- ============================================================================
-- 3. CANDIDATE_PHOTOS TABLE
-- ============================================================================

CREATE TABLE candidate_photos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- Photo metadata
    photo_type photo_type NOT NULL,
    storage_path text NOT NULL,
    file_size integer,
    mime_type varchar(50),
    
    -- Upload and approval
    uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
    is_approved boolean NOT NULL DEFAULT false,
    is_primary boolean NOT NULL DEFAULT false,
    
    -- Metadata
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(candidate_id, photo_type, is_primary),
    CHECK (file_size IS NULL OR file_size > 0),
    CHECK (mime_type IS NULL OR mime_type IN ('image/jpeg', 'image/png', 'image/webp'))
);

-- Indexes on candidate_photos
CREATE INDEX idx_candidate_photos_candidate ON candidate_photos(candidate_id);
CREATE INDEX idx_candidate_photos_type ON candidate_photos(photo_type);
CREATE INDEX idx_candidate_photos_approved ON candidate_photos(is_approved);
CREATE INDEX idx_candidate_photos_primary ON candidate_photos(is_primary);
CREATE INDEX idx_candidate_photos_uploaded ON candidate_photos(uploaded_at DESC);

-- ============================================================================
-- 4. CANDIDATE_SUGGESTIONS TABLE
-- ============================================================================

CREATE TABLE candidate_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    step_id uuid NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
    submitted_by uuid NOT NULL,
    
    -- Suggestion content
    suggestion text NOT NULL,
    is_mandatory boolean NOT NULL DEFAULT false,
    
    -- Metadata
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CHECK (suggestion IS NOT NULL AND suggestion != '')
);

-- Indexes on candidate_suggestions
CREATE INDEX idx_candidate_suggestions_candidate ON candidate_suggestions(candidate_id);
CREATE INDEX idx_candidate_suggestions_step ON candidate_suggestions(step_id);
CREATE INDEX idx_candidate_suggestions_submitted_by ON candidate_suggestions(submitted_by);
CREATE INDEX idx_candidate_suggestions_mandatory ON candidate_suggestions(is_mandatory);
CREATE INDEX idx_candidate_suggestions_created ON candidate_suggestions(created_at DESC);

-- ============================================================================
-- 5. FUNCTIONS
-- ============================================================================

-- Function: Generate unique candidate code (AWAC-YYYY-XXXX format)
CREATE OR REPLACE FUNCTION generate_candidate_code(
    p_competition_id uuid,
    p_year integer
)
RETURNS varchar AS $$
DECLARE
    v_code varchar;
    v_sequence integer;
    v_year varchar;
BEGIN
    -- Get current year if not provided
    v_year := LPAD(p_year::text, 4, '0');
    
    -- Get next sequence number for this competition this year
    SELECT COALESCE(MAX(CAST(SUBSTR(unique_code, 11) AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM candidates
    WHERE competition_id = p_competition_id
        AND unique_code LIKE 'AWAC-' || v_year || '-%';
    
    -- Format: AWAC-YYYY-XXXX (where XXXX is 4-digit sequence)
    v_code := 'AWAC-' || v_year || '-' || LPAD(v_sequence::text, 4, '0');
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-generate unique_code if not provided
CREATE OR REPLACE FUNCTION set_candidate_unique_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unique_code IS NULL OR NEW.unique_code = '' THEN
        NEW.unique_code := generate_candidate_code(
            NEW.competition_id,
            EXTRACT(YEAR FROM NEW.registration_date)::integer
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Trigger: Auto-generate unique_code on insert
CREATE TRIGGER candidates_auto_unique_code_trigger
BEFORE INSERT ON candidates
FOR EACH ROW
EXECUTE FUNCTION set_candidate_unique_code();

-- Trigger: Update updated_at on candidates
CREATE TRIGGER candidates_updated_at_trigger
BEFORE UPDATE ON candidates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on candidate_suggestions
CREATE TRIGGER candidate_suggestions_updated_at_trigger
BEFORE UPDATE ON candidate_suggestions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. VIEWS
-- ============================================================================

-- View: Candidates with photo count
CREATE VIEW candidates_with_photo_count AS
SELECT 
    c.id,
    c.competition_id,
    c.first_name,
    c.last_name,
    c.unique_code,
    c.email,
    c.status,
    c.gender,
    c.category,
    COUNT(cp.id) as photo_count,
    COUNT(CASE WHEN cp.is_approved THEN 1 END) as approved_photos,
    COUNT(CASE WHEN cp.is_primary THEN 1 END) as primary_photo,
    c.created_at,
    c.updated_at
FROM candidates c
LEFT JOIN candidate_photos cp ON c.id = cp.candidate_id
GROUP BY c.id, c.competition_id, c.first_name, c.last_name, c.unique_code,
         c.email, c.status, c.gender, c.category, c.created_at, c.updated_at;

-- View: Candidates by category and gender (for statistics)
CREATE VIEW candidates_by_category_gender AS
SELECT 
    c.competition_id,
    c.category,
    c.gender,
    c.status,
    COUNT(*) as candidate_count
FROM candidates c
GROUP BY c.competition_id, c.category, c.gender, c.status;

-- View: Candidates registration summary
CREATE VIEW candidates_registration_summary AS
SELECT 
    c.competition_id,
    COUNT(*) as total_registered,
    COUNT(CASE WHEN c.status = 'registered' THEN 1 END) as pending_review,
    COUNT(CASE WHEN c.status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN c.status = 'rejected' THEN 1 END) as rejected,
    COUNT(CASE WHEN c.status = 'withdrawn' THEN 1 END) as withdrawn,
    COUNT(CASE WHEN c.disqualified THEN 1 END) as disqualified
FROM candidates c
GROUP BY c.competition_id;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_suggestions ENABLE ROW LEVEL SECURITY;

-- CANDIDATES POLICIES

-- Administrators can see all candidates
CREATE POLICY "candidates_admin_all"
ON candidates
FOR SELECT
USING (
    get_user_role() = 'administrator'
);

-- Moderators can see all candidates in their competitions
CREATE POLICY "candidates_moderator_all"
ON candidates
FOR SELECT
USING (
    get_user_role() = 'moderator'
);

-- Jury members can see approved/disqualified candidates from their steps
CREATE POLICY "candidates_jury_assigned"
ON candidates
FOR SELECT
USING (
    get_user_role() = 'jury_member'
    AND status IN ('approved', 'disqualified')
    AND competition_id IN (
        SELECT DISTINCT s.competition_id
        FROM steps s
        WHERE s.status IN ('active', 'closed')
    )
);

-- Public can see approved candidates
CREATE POLICY "candidates_public_approved"
ON candidates
FOR SELECT
USING (
    get_user_role() = 'public'
    AND status = 'approved'
    AND competition_id IN (
        SELECT id FROM competitions WHERE is_active = true
    )
);

-- Only administrators and moderators can insert candidates
CREATE POLICY "candidates_admin_moderator_insert"
ON candidates
FOR INSERT
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Only administrators and moderators can update candidates
CREATE POLICY "candidates_admin_moderator_update"
ON candidates
FOR UPDATE
USING (
    get_user_role() IN ('administrator', 'moderator')
)
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Only administrators can delete candidates
CREATE POLICY "candidates_admin_delete"
ON candidates
FOR DELETE
USING (
    get_user_role() = 'administrator'
);

-- CANDIDATE_PHOTOS POLICIES

-- Administrators can see all photos
CREATE POLICY "candidate_photos_admin_all"
ON candidate_photos
FOR SELECT
USING (
    get_user_role() = 'administrator'
);

-- Moderators can see all photos
CREATE POLICY "candidate_photos_moderator_all"
ON candidate_photos
FOR SELECT
USING (
    get_user_role() = 'moderator'
);

-- Jury members can see approved photos of assigned candidates
CREATE POLICY "candidate_photos_jury_approved"
ON candidate_photos
FOR SELECT
USING (
    get_user_role() = 'jury_member'
    AND is_approved = true
    AND candidate_id IN (
        SELECT id FROM candidates
        WHERE status IN ('approved', 'disqualified')
    )
);

-- Public can see approved photos of approved candidates
CREATE POLICY "candidate_photos_public_approved"
ON candidate_photos
FOR SELECT
USING (
    get_user_role() = 'public'
    AND is_approved = true
    AND candidate_id IN (
        SELECT id FROM candidates
        WHERE status = 'approved'
    )
);

-- Only administrators and moderators can insert photos
CREATE POLICY "candidate_photos_admin_moderator_insert"
ON candidate_photos
FOR INSERT
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Only administrators and moderators can update photos
CREATE POLICY "candidate_photos_admin_moderator_update"
ON candidate_photos
FOR UPDATE
USING (
    get_user_role() IN ('administrator', 'moderator')
)
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Only administrators can delete photos
CREATE POLICY "candidate_photos_admin_delete"
ON candidate_photos
FOR DELETE
USING (
    get_user_role() = 'administrator'
);

-- CANDIDATE_SUGGESTIONS POLICIES

-- Administrators can see all suggestions
CREATE POLICY "candidate_suggestions_admin_all"
ON candidate_suggestions
FOR SELECT
USING (
    get_user_role() = 'administrator'
);

-- Moderators can see all suggestions
CREATE POLICY "candidate_suggestions_moderator_all"
ON candidate_suggestions
FOR SELECT
USING (
    get_user_role() = 'moderator'
);

-- Jury members can see mandatory suggestions for their steps
CREATE POLICY "candidate_suggestions_jury_mandatory"
ON candidate_suggestions
FOR SELECT
USING (
    get_user_role() = 'jury_member'
    AND is_mandatory = true
    AND step_id IN (
        SELECT id FROM steps WHERE status IN ('active', 'closed')
    )
);

-- Only administrators and moderators can insert suggestions
CREATE POLICY "candidate_suggestions_admin_moderator_insert"
ON candidate_suggestions
FOR INSERT
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Only administrators and moderators can update suggestions
CREATE POLICY "candidate_suggestions_admin_moderator_update"
ON candidate_suggestions
FOR UPDATE
USING (
    get_user_role() IN ('administrator', 'moderator')
)
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Only administrators can delete suggestions
CREATE POLICY "candidate_suggestions_admin_delete"
ON candidate_suggestions
FOR DELETE
USING (
    get_user_role() = 'administrator'
);

-- ============================================================================
-- 9. COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE candidates IS 'Competition participants';
COMMENT ON COLUMN candidates.unique_code IS 'Unique identifier: AWAC-YYYY-XXXX format';
COMMENT ON COLUMN candidates.status IS 'Participation status: registered, approved, rejected, withdrawn, disqualified';
COMMENT ON COLUMN candidates.disqualified IS 'Flag: set to true if disqualified during competition';

COMMENT ON TABLE candidate_photos IS 'Photos of candidates (profile and creation)';
COMMENT ON COLUMN candidate_photos.photo_type IS 'Type: profile (passport-like) or creation (garment/artwork)';
COMMENT ON COLUMN candidate_photos.is_approved IS 'Admin approval status for photo quality';
COMMENT ON COLUMN candidate_photos.is_primary IS 'Primary photo to display in listings';

COMMENT ON TABLE candidate_suggestions IS 'Suggestions/recommendations for candidates from jury members';
COMMENT ON COLUMN candidate_suggestions.is_mandatory IS 'Mandatory suggestion must be provided by jury';

COMMENT ON FUNCTION generate_candidate_code IS 'Generates unique candidate codes in AWAC-YYYY-XXXX format';

-- ============================================================================
-- 10. GRANTS
-- ============================================================================

GRANT SELECT ON candidates TO anon;
GRANT SELECT ON candidate_photos TO anon;
GRANT SELECT ON candidates_with_photo_count TO anon;
GRANT SELECT ON candidates_by_category_gender TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON candidates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON candidate_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON candidate_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION generate_candidate_code TO authenticated;

-- ============================================================================
-- END OF MIGRATION 0003
-- ============================================================================
-- Next migrations:
--   0004_jury_management.sql - Jury groups, members, and assignments
--   0005_scoring_system.sql - Criteria, scores, comments
--   0006_results_certificates.sql - Results, certificates, signatures
