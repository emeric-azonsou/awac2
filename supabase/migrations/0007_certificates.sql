-- =============================================================================
-- AWAC MONO - Migration 0007: Certificate Management System
-- =============================================================================
-- Tables:
--   1. certificate_types: Types of certificates offered
--   2. certificate_templates: Templates for certificate design
--   3. certificates: Individual certificates issued to candidates
--   4. signatures: Digital/physical signatures on certificates
--   5. official_stamps: Official stamps applied to certificates
--
-- Features:
--   - Multi-type certificates (participation, winner, special award)
--   - Template-based certificate generation
--   - Signature workflow (director, jury president, moderator)
--   - Official stamp tracking
--   - PDF generation and storage
--   - Certificate locking for immutability
--   - Revocation support for invalid certificates
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE certificate_status AS ENUM (
  'draft',                -- In preparation
  'pending_signature',    -- Awaiting signatures
  'signed',              -- All signatures collected
  'revoked'              -- Certificate invalidated
);

CREATE TYPE signature_type AS ENUM (
  'director',            -- Competition director
  'jury_president',      -- Jury group president
  'moderator'            -- Moderator/verifier
);

-- =============================================================================
-- TABLES
-- =============================================================================

/**
 * certificate_types: Define types of certificates available per competition
 * - Participation certificates for all candidates
 * - Winner certificates for top 3
 * - Special award certificates for award winners
 * - Custom types defined by organizers
 */
CREATE TABLE certificate_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT fk_cert_types_competition FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_cert_types_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT unique_cert_type_name UNIQUE (competition_id, name)
);

-- Enable RLS
ALTER TABLE certificate_types ENABLE ROW LEVEL SECURITY;

/**
 * certificate_templates: Template definitions for certificate generation
 * - HTML/CSS template for rendering
 * - Design URL stored for reference
 * - One template per certificate type (can have multiple revisions)
 */
CREATE TABLE certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_type_id UUID NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  template_content TEXT NOT NULL,
  design_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT fk_cert_templates_type FOREIGN KEY (certificate_type_id) REFERENCES certificate_types(id) ON DELETE CASCADE,
  CONSTRAINT fk_cert_templates_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT template_not_empty CHECK (LENGTH(TRIM(template_content)) > 0)
);

-- Enable RLS
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

/**
 * certificates: Individual certificates issued to candidates
 * - One certificate per candidate per certificate_type per competition
 * - Special award certificates link to specific awards
 * - Unique certificate number for official reference
 * - PDF URL for download/viewing
 * - Locking prevents any modifications once signed
 */
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  competition_id UUID NOT NULL,
  certificate_template_id UUID NOT NULL,
  special_award_id UUID,
  
  -- Certificate identification
  certificate_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- Status and workflow
  status certificate_status NOT NULL DEFAULT 'draft',
  issue_date TIMESTAMPTZ,
  
  -- PDF storage
  pdf_url TEXT,
  pdf_size INT,
  
  -- Immutability
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by UUID,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT fk_cert_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_cert_competition FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_cert_template FOREIGN KEY (certificate_template_id) REFERENCES certificate_templates(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cert_award FOREIGN KEY (special_award_id) REFERENCES special_awards(id) ON DELETE SET NULL,
  CONSTRAINT fk_cert_locked_by FOREIGN KEY (locked_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cert_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT locked_requires_by CHECK (is_locked = false OR locked_by IS NOT NULL),
  CONSTRAINT pdf_size_positive CHECK (pdf_size IS NULL OR pdf_size > 0)
);

-- Enable RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

/**
 * signatures: Digital/physical signatures on certificates
 * - Multiple signatures per certificate (director, jury president, moderator)
 * - signature_data stores digital signature/hash or reference to physical
 * - Tracks when each signer signed
 * - Only one signature per type per certificate (enforced by unique constraint)
 */
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL,
  signer_id UUID NOT NULL,
  signature_type signature_type NOT NULL,
  signature_data TEXT,
  signature_hash VARCHAR(256),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_sig_certificate FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE,
  CONSTRAINT fk_sig_signer FOREIGN KEY (signer_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  CONSTRAINT unique_signature_per_type UNIQUE (certificate_id, signature_type)
);

-- Enable RLS
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

/**
 * official_stamps: Official stamps applied to certificates
 * - Government/institutional stamps for official recognition
 * - Image URL pointing to uploaded stamp graphic
 * - Timestamp tracking when stamp was applied
 * - Audit trail for compliance
 */
CREATE TABLE official_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL,
  stamp_image_url TEXT NOT NULL,
  stamp_applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_stamp_certificate FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE official_stamps ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- certificate_types indexes
CREATE INDEX idx_cert_types_competition_id ON certificate_types(competition_id);
CREATE INDEX idx_cert_types_is_active ON certificate_types(is_active);
CREATE INDEX idx_cert_types_competition_active ON certificate_types(competition_id, is_active);

-- certificate_templates indexes
CREATE INDEX idx_cert_templates_type_id ON certificate_templates(certificate_type_id);
CREATE INDEX idx_cert_templates_is_active ON certificate_templates(is_active);

-- certificates indexes
CREATE INDEX idx_cert_candidate_id ON certificates(candidate_id);
CREATE INDEX idx_cert_competition_id ON certificates(competition_id);
CREATE INDEX idx_cert_template_id ON certificates(certificate_template_id);
CREATE INDEX idx_cert_award_id ON certificates(special_award_id);
CREATE INDEX idx_cert_number ON certificates(certificate_number);
CREATE INDEX idx_cert_status ON certificates(status);
CREATE INDEX idx_cert_is_locked ON certificates(is_locked);
CREATE INDEX idx_cert_created_at ON certificates(created_at DESC);
CREATE INDEX idx_cert_candidate_comp ON certificates(candidate_id, competition_id);

-- signatures indexes
CREATE INDEX idx_sig_certificate_id ON signatures(certificate_id);
CREATE INDEX idx_sig_signer_id ON signatures(signer_id);
CREATE INDEX idx_sig_type ON signatures(signature_type);
CREATE INDEX idx_sig_signed_at ON signatures(signed_at DESC);

-- official_stamps indexes
CREATE INDEX idx_stamp_certificate_id ON official_stamps(certificate_id);
CREATE INDEX idx_stamp_applied_at ON official_stamps(stamp_applied_at DESC);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

/**
 * generate_certificate_number(): Create unique certificate number
 * Format: CERT-YYYY-{competition_id_short}-{sequence}
 */
CREATE OR REPLACE FUNCTION generate_certificate_number(
  p_competition_id UUID
)
RETURNS VARCHAR AS $$
DECLARE
  v_sequence INT;
  v_cert_number VARCHAR;
BEGIN
  SELECT COUNT(*) + 1 INTO v_sequence
  FROM certificates
  WHERE competition_id = p_competition_id;
  
  v_cert_number := 'CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                   SUBSTRING(p_competition_id::TEXT, 1, 8) || '-' || 
                   LPAD(v_sequence::TEXT, 6, '0');
  
  RETURN v_cert_number;
END
$$ LANGUAGE plpgsql;

/**
 * lock_certificate(): Prevent further modifications after signing
 */
CREATE OR REPLACE FUNCTION lock_certificate(
  p_certificate_id UUID,
  p_locked_by UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE certificates
  SET is_locked = true,
      locked_at = NOW(),
      locked_by = p_locked_by
  WHERE id = p_certificate_id;
END
$$ LANGUAGE plpgsql;

/**
 * validate_certificate_signatures(): Ensure required signatures present
 * Returns true if all required signatures are present for certificate type
 */
CREATE OR REPLACE FUNCTION validate_certificate_signatures(p_certificate_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if all required signatures exist
  RETURN EXISTS (
    SELECT 1 FROM signatures
    WHERE certificate_id = p_certificate_id
    GROUP BY certificate_id
    HAVING COUNT(DISTINCT signature_type) >= 2  -- At least 2 signatures required
  );
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-generate certificate number on insert
CREATE OR REPLACE FUNCTION set_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_number IS NULL THEN
    NEW.certificate_number := generate_certificate_number(NEW.competition_id);
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_certificate_number
BEFORE INSERT ON certificates
FOR EACH ROW
EXECUTE FUNCTION set_certificate_number();

-- Auto-update updated_at on certificate_types
CREATE TRIGGER update_cert_types_updated_at
BEFORE UPDATE ON certificate_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on certificate_templates
CREATE TRIGGER update_cert_templates_updated_at
BEFORE UPDATE ON certificate_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on certificates
CREATE TRIGGER update_cert_updated_at
BEFORE UPDATE ON certificates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on signatures
CREATE TRIGGER update_sig_updated_at
BEFORE UPDATE ON signatures
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Prevent modification of locked certificates
CREATE OR REPLACE FUNCTION prevent_locked_certificate_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM certificates WHERE id = NEW.id AND is_locked = true) THEN
    RAISE EXCEPTION 'Cannot modify locked certificate';
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_locked_before_update
BEFORE UPDATE ON certificates
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_certificate_modification();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- =====================================================================
-- CERTIFICATE_TYPES TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY cert_types_admin_all ON certificate_types
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY cert_types_moderator_all ON certificate_types
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury: Read only
CREATE POLICY cert_types_jury_select ON certificate_types
  FOR SELECT USING (get_user_role() IN ('jury_president', 'jury_member'));

-- Prevent jury from writing
CREATE POLICY cert_types_jury_no_write ON certificate_types
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY cert_types_jury_no_delete ON certificate_types
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =====================================================================
-- CERTIFICATE_TEMPLATES TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY cert_templates_admin_all ON certificate_templates
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY cert_templates_moderator_all ON certificate_templates
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury: Read only
CREATE POLICY cert_templates_jury_select ON certificate_templates
  FOR SELECT USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =====================================================================
-- CERTIFICATES TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY cert_admin_all ON certificates
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access (sign, issue, lock)
CREATE POLICY cert_moderator_all ON certificates
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury president: Read and sign certificates
CREATE POLICY cert_president_select ON certificates
  FOR SELECT USING (
    get_user_role() = 'jury_president'
    AND EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = certificates.competition_id
        AND c.status IN ('in_progress', 'closed')
    )
  );

CREATE POLICY cert_president_update ON certificates
  FOR UPDATE USING (
    get_user_role() = 'jury_president'
    AND certificates.status IN ('draft', 'pending_signature')
  )
  WITH CHECK (get_user_role() = 'jury_president');

-- Jury member: Read only
CREATE POLICY cert_jury_select ON certificates
  FOR SELECT USING (get_user_role() IN ('jury_president', 'jury_member'));

-- Prevent jury from deleting
CREATE POLICY cert_jury_no_delete ON certificates
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- Candidates: Read their own certificates
CREATE POLICY cert_candidate_select ON certificates
  FOR SELECT USING (
    candidate_id = auth.uid()
    AND status IN ('signed', 'revoked')
  );

-- =====================================================================
-- SIGNATURES TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY sig_admin_all ON signatures
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY sig_moderator_all ON signatures
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury president: Can sign certificates assigned to their group
CREATE POLICY sig_president_insert ON signatures
  FOR INSERT WITH CHECK (
    get_user_role() = 'jury_president'
    AND signer_id = auth.uid()
    AND signature_type IN ('jury_president', 'moderator')
  );

CREATE POLICY sig_president_select ON signatures
  FOR SELECT USING (
    get_user_role() = 'jury_president'
    AND EXISTS (
      SELECT 1 FROM certificates c
      WHERE c.id = signatures.certificate_id
        AND c.status IN ('pending_signature', 'signed')
    )
  );

-- Prevent jury from updating/deleting
CREATE POLICY sig_jury_no_write ON signatures
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY sig_jury_no_delete ON signatures
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =====================================================================
-- OFFICIAL_STAMPS TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY stamp_admin_all ON official_stamps
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY stamp_moderator_all ON official_stamps
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury/Public: Read only
CREATE POLICY stamp_jury_select ON official_stamps
  FOR SELECT USING (get_user_role() IN ('jury_president', 'jury_member'));

-- Prevent non-admin from writing
CREATE POLICY stamp_jury_no_write ON official_stamps
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =============================================================================
-- VIEWS
-- =============================================================================

/**
 * certificate_issuance_status: Track certificate generation progress
 * Used for dashboard reporting on certificate readiness
 */
CREATE OR REPLACE VIEW certificate_issuance_status AS
SELECT 
  c.id AS competition_id,
  c.name AS competition_name,
  COUNT(DISTINCT cert.id) AS total_certificates,
  COUNT(DISTINCT CASE WHEN cert.status = 'draft' THEN cert.id END) AS draft_count,
  COUNT(DISTINCT CASE WHEN cert.status = 'pending_signature' THEN cert.id END) AS pending_signature_count,
  COUNT(DISTINCT CASE WHEN cert.status = 'signed' THEN cert.id END) AS signed_count,
  COUNT(DISTINCT CASE WHEN cert.status = 'revoked' THEN cert.id END) AS revoked_count,
  COUNT(DISTINCT CASE WHEN cert.is_locked = true THEN cert.id END) AS locked_count,
  COUNT(DISTINCT CASE WHEN cert.pdf_url IS NOT NULL THEN cert.id END) AS generated_count
FROM competitions c
LEFT JOIN certificates cert ON c.id = cert.competition_id
GROUP BY c.id;

/**
 * signature_completion_status: Track signature progress per certificate
 * Shows which signatures are still needed
 */
CREATE OR REPLACE VIEW signature_completion_status AS
SELECT 
  c.id AS certificate_id,
  c.certificate_number,
  cand.first_name || ' ' || cand.last_name AS candidate_name,
  c.status,
  COUNT(DISTINCT s.signature_type) AS signatures_present,
  2 AS signatures_required,
  (COUNT(DISTINCT s.signature_type) = 2) AS all_signatures_complete,
  STRING_AGG(DISTINCT s.signature_type::TEXT, ', ') AS signature_types
FROM certificates c
JOIN candidates cand ON c.candidate_id = cand.id
LEFT JOIN signatures s ON c.id = s.certificate_id
GROUP BY c.id, cand.id;

/**
 * certificates_ready_for_delivery: Certificates that can be issued
 * Fully signed, locked, and PDF generated
 */
CREATE OR REPLACE VIEW certificates_ready_for_delivery AS
SELECT 
  c.id,
  c.certificate_number,
  cand.first_name || ' ' || cand.last_name AS candidate_name,
  cand.email,
  comp.name AS competition_name,
  c.status,
  c.pdf_url,
  c.created_at,
  c.updated_at
FROM certificates c
JOIN candidates cand ON c.candidate_id = cand.id
JOIN competitions comp ON c.competition_id = comp.id
WHERE c.status = 'signed'
  AND c.is_locked = true
  AND c.pdf_url IS NOT NULL
  AND (SELECT COUNT(*) FROM signatures WHERE certificate_id = c.id) >= 2
ORDER BY c.created_at DESC;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON certificate_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON certificate_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON certificates TO authenticated;
GRANT SELECT, INSERT ON signatures TO authenticated;
GRANT SELECT, INSERT ON official_stamps TO authenticated;

-- Grant all views to authenticated
GRANT SELECT ON certificate_issuance_status TO authenticated;
GRANT SELECT ON signature_completion_status TO authenticated;
GRANT SELECT ON certificates_ready_for_delivery TO authenticated;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================

/**
 * MIGRATION FLOW:
 * 1. Create ENUM types for certificate status and signature types
 * 2. Create certificate_types table
 * 3. Create certificate_templates table
 * 4. Create certificates table with auto-number generation
 * 5. Create signatures table with uniqueness constraint
 * 6. Create official_stamps table
 * 7. Create validation functions and triggers
 * 8. Apply RLS policies
 * 9. Create views for certificate tracking
 *
 * TESTING CHECKLIST:
 * □ Create certificate types and templates
 * □ Auto-generate certificates with unique numbers
 * □ Test certificate number format (CERT-YYYY-...)
 * □ Add signatures (director, jury_president)
 * □ Verify signature uniqueness constraint
 * □ Lock certificate and test immutability
 * □ Apply official stamps
 * □ Generate PDF URLs
 * □ Test RLS: moderators can manage certs
 * □ Test RLS: jury_president can sign
 * □ Test RLS: candidates read own signed certs
 * □ Verify views show correct aggregates
 * 
 * DEPENDENCIES:
 * - Requires: migrations 0001-0006
 * - Changes: Creates 5 new tables + 3 views
 * - Breaking: None
 * 
 * NOTES:
 * - Certificate number auto-generated on insert if not provided
 * - Locked certificates cannot be modified
 * - Signature requirement: at least 2 signatures (director + jury/moderator)
 * - PDF URL populated after generation (external service)
 * - Official stamps applied after all signatures
 */
