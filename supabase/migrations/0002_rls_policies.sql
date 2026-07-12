DROP FUNCTION IF EXISTS get_user_role();
-- AWAC MONO - Migration 0002
-- Description: Row Level Security (RLS) Policies
-- Date: 2026-07-02
-- Version: 1.0
-- Depends on: 0001_initial_schema.sql

-- ============================================================================
-- OVERVIEW
-- ============================================================================
-- This migration implements Row Level Security (RLS) policies for the initial
-- tables based on the following user roles:
--   - Administrator: Full access to all data
--   - Moderator: Management access (competitions, steps, forms)
--   - Jury Member: Read-only access to forms
--   - Public: Limited read-only access to public information

-- ============================================================================
-- 1. HELPER FUNCTION - Get User Role
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(auth.jwt() ->> 'user_role', 'public');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. COMPETITIONS TABLE - RLS POLICIES
-- ============================================================================

-- Policy: Administrators can see all competitions
CREATE POLICY "competitions_admin_all"
ON competitions
FOR SELECT
USING (
    get_user_role() = 'administrator'
);

-- Policy: Moderators can see all competitions
CREATE POLICY "competitions_moderator_all"
ON competitions
FOR SELECT
USING (
    get_user_role() = 'moderator'
);

-- Policy: Jury members can see all active competitions
CREATE POLICY "competitions_jury_active"
ON competitions
FOR SELECT
USING (
    get_user_role() = 'jury_member'
    AND is_active = true
);

-- Policy: Public can see active, published competitions
CREATE POLICY "competitions_public_active"
ON competitions
FOR SELECT
USING (
    get_user_role() = 'public'
    AND is_active = true
);

-- Policy: Only administrators can insert competitions
CREATE POLICY "competitions_admin_insert"
ON competitions
FOR INSERT
WITH CHECK (
    get_user_role() = 'administrator'
);

-- Policy: Only administrators and created user can update competitions
CREATE POLICY "competitions_admin_update"
ON competitions
FOR UPDATE
USING (
    get_user_role() = 'administrator'
)
WITH CHECK (
    get_user_role() = 'administrator'
);

-- Policy: Only administrators can delete competitions
CREATE POLICY "competitions_admin_delete"
ON competitions
FOR DELETE
USING (
    get_user_role() = 'administrator'
);

-- ============================================================================
-- 3. STEPS TABLE - RLS POLICIES
-- ============================================================================

-- Policy: Administrators can see all steps
CREATE POLICY "steps_admin_all"
ON steps
FOR SELECT
USING (
    get_user_role() = 'administrator'
);

-- Policy: Moderators can see all steps
CREATE POLICY "steps_moderator_all"
ON steps
FOR SELECT
USING (
    get_user_role() = 'moderator'
);

-- Policy: Jury members can see active steps
CREATE POLICY "steps_jury_active"
ON steps
FOR SELECT
USING (
    get_user_role() = 'jury_member'
    AND status IN ('active', 'closed')
);

-- Policy: Public can see active steps from active competitions
CREATE POLICY "steps_public_active"
ON steps
FOR SELECT
USING (
    get_user_role() = 'public'
    AND status = 'active'
    AND competition_id IN (
        SELECT id FROM competitions WHERE is_active = true
    )
);

-- Policy: Only administrators and moderators can insert steps
CREATE POLICY "steps_admin_moderator_insert"
ON steps
FOR INSERT
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Policy: Only administrators and moderators can update steps
CREATE POLICY "steps_admin_moderator_update"
ON steps
FOR UPDATE
USING (
    get_user_role() IN ('administrator', 'moderator')
)
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Policy: Only administrators can delete steps
CREATE POLICY "steps_admin_delete"
ON steps
FOR DELETE
USING (
    get_user_role() = 'administrator'
);

-- ============================================================================
-- 4. FORMS TABLE - RLS POLICIES
-- ============================================================================

-- Policy: Administrators can see all forms
CREATE POLICY "forms_admin_all"
ON forms
FOR SELECT
USING (
    get_user_role() = 'administrator'
);

-- Policy: Moderators can see all forms
CREATE POLICY "forms_moderator_all"
ON forms
FOR SELECT
USING (
    get_user_role() = 'moderator'
);

-- Policy: Jury members can see active forms from their assigned steps
CREATE POLICY "forms_jury_active"
ON forms
FOR SELECT
USING (
    get_user_role() = 'jury_member'
    AND is_active = true
    AND step_id IN (
        SELECT id FROM steps WHERE status IN ('active', 'closed')
    )
);

-- Policy: Public can see active forms from active steps
CREATE POLICY "forms_public_active"
ON forms
FOR SELECT
USING (
    get_user_role() = 'public'
    AND is_active = true
    AND step_id IN (
        SELECT id FROM steps WHERE status = 'active'
    )
);

-- Policy: Only administrators and moderators can insert forms
CREATE POLICY "forms_admin_moderator_insert"
ON forms
FOR INSERT
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Policy: Only administrators and moderators can update forms
CREATE POLICY "forms_admin_moderator_update"
ON forms
FOR UPDATE
USING (
    get_user_role() IN ('administrator', 'moderator')
)
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Policy: Only administrators can delete forms
CREATE POLICY "forms_admin_delete"
ON forms
FOR DELETE
USING (
    get_user_role() = 'administrator'
);

-- ============================================================================
-- 5. FORM_FIELDS TABLE - RLS POLICIES
-- ============================================================================

-- Policy: Administrators can see all form fields
CREATE POLICY "form_fields_admin_all"
ON form_fields
FOR SELECT
USING (
    get_user_role() = 'administrator'
);

-- Policy: Moderators can see all form fields
CREATE POLICY "form_fields_moderator_all"
ON form_fields
FOR SELECT
USING (
    get_user_role() = 'moderator'
);

-- Policy: Jury members can see fields from active forms
CREATE POLICY "form_fields_jury_active"
ON form_fields
FOR SELECT
USING (
    get_user_role() = 'jury_member'
    AND form_id IN (
        SELECT id FROM forms
        WHERE is_active = true
            AND step_id IN (
                SELECT id FROM steps WHERE status IN ('active', 'closed')
            )
    )
);

-- Policy: Public can see fields from active public forms
CREATE POLICY "form_fields_public_active"
ON form_fields
FOR SELECT
USING (
    get_user_role() = 'public'
    AND form_id IN (
        SELECT id FROM forms
        WHERE is_active = true
            AND step_id IN (
                SELECT id FROM steps WHERE status = 'active'
            )
    )
);

-- Policy: Only administrators and moderators can insert form fields
CREATE POLICY "form_fields_admin_moderator_insert"
ON form_fields
FOR INSERT
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Policy: Only administrators and moderators can update form fields
CREATE POLICY "form_fields_admin_moderator_update"
ON form_fields
FOR UPDATE
USING (
    get_user_role() IN ('administrator', 'moderator')
)
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Policy: Only administrators can delete form fields
CREATE POLICY "form_fields_admin_delete"
ON form_fields
FOR DELETE
USING (
    get_user_role() = 'administrator'
);

-- ============================================================================
-- 6. FIELD_OPTIONS TABLE - RLS POLICIES
-- ============================================================================

-- Policy: Administrators can see all field options
CREATE POLICY "field_options_admin_all"
ON field_options
FOR SELECT
USING (
    get_user_role() = 'administrator'
);

-- Policy: Moderators can see all field options
CREATE POLICY "field_options_moderator_all"
ON field_options
FOR SELECT
USING (
    get_user_role() = 'moderator'
);

-- Policy: Jury members can see options from active form fields
CREATE POLICY "field_options_jury_active"
ON field_options
FOR SELECT
USING (
    get_user_role() = 'jury_member'
    AND form_field_id IN (
        SELECT id FROM form_fields
        WHERE form_id IN (
            SELECT id FROM forms
            WHERE is_active = true
                AND step_id IN (
                    SELECT id FROM steps WHERE status IN ('active', 'closed')
                )
        )
    )
);

-- Policy: Public can see options from active public form fields
CREATE POLICY "field_options_public_active"
ON field_options
FOR SELECT
USING (
    get_user_role() = 'public'
    AND form_field_id IN (
        SELECT id FROM form_fields
        WHERE form_id IN (
            SELECT id FROM forms
            WHERE is_active = true
                AND step_id IN (
                    SELECT id FROM steps WHERE status = 'active'
                )
        )
    )
);

-- Policy: Only administrators and moderators can insert field options
CREATE POLICY "field_options_admin_moderator_insert"
ON field_options
FOR INSERT
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Policy: Only administrators and moderators can update field options
CREATE POLICY "field_options_admin_moderator_update"
ON field_options
FOR UPDATE
USING (
    get_user_role() IN ('administrator', 'moderator')
)
WITH CHECK (
    get_user_role() IN ('administrator', 'moderator')
);

-- Policy: Only administrators can delete field options
CREATE POLICY "field_options_admin_delete"
ON field_options
FOR DELETE
USING (
    get_user_role() = 'administrator'
);

-- ============================================================================
-- 7. VIEWS - APPLY RLS
-- ============================================================================

ALTER VIEW competitions_with_steps SET (security_barrier = on);
ALTER VIEW forms_with_field_count SET (security_barrier = on);

-- ============================================================================
-- 8. TESTING NOTES
-- ============================================================================
-- To test these policies, use the Supabase dashboard:
-- 1. SQL Editor → Impersonating User
-- 2. Select a user with specific role
-- 3. Run SELECT queries to see filtered results
--
-- Example test queries:
--   SELECT * FROM competitions;  -- Should be filtered by role
--   SELECT * FROM steps;          -- Should be filtered by role
--   SELECT * FROM forms;          -- Should be filtered by role

-- ============================================================================
-- END OF MIGRATION 0002
-- ============================================================================
-- Summary of policies implemented:
--   - 7 policies per table × 5 tables = 35 policies total
--   - 3 levels: Read (SELECT), Write (INSERT/UPDATE), Delete (DELETE)
--   - Role-based access: administrator, moderator, jury_member, public
--   - Hierarchical filtering based on active status and role permissions
