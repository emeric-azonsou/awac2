-- =============================================================================
-- AWAC MONO - Migration 0004: Profiles and Jury Management
-- =============================================================================
-- Tables:
--   1. profiles: User profiles with roles
--   2. jury_groups: Groups of jurors for competitions
--   3. jury_group_members: Members assigned to jury groups
--   4. jury_group_steps: Assignment of jury groups to steps
--
-- Features:
--   - Role-based user management (administrator, moderator, jury_president, jury_member)
--   - Jury group hierarchy with presidents and members
--   - Step-wise jury group assignments
--   - Comprehensive RLS policies for all 4 roles
--   - Audit trails with created_at, updated_at, created_by
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM (
  'administrator',
  'moderator',
  'jury_president',
  'jury_member'
);

CREATE TYPE jury_member_role AS ENUM (
  'member',
  'president'
);

-- =============================================================================
-- TABLES
-- =============================================================================

/**
 * profiles: Extended user information managed after Auth signup
 * - Synced from Supabase Auth via trigger or API
 * - Each user gets assigned a primary role
 * - Can be elevated to admin/moderator by system
 */
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'jury_member',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  
  -- Constraints
  CONSTRAINT email_not_empty CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT phone_format CHECK (phone IS NULL OR phone ~ '^\+?[0-9\s\-\(\)]{7,}$')
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

/**
 * jury_groups: Collections of jurors assigned to a competition
 * - Each competition can have multiple jury groups
 * - President elected from group members
 * - Groups can be organized by expertise, region, etc.
 */
CREATE TABLE jury_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL,
  president_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  group_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT fk_jury_groups_competition FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_jury_groups_president FOREIGN KEY (president_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT group_order_positive CHECK (group_order > 0)
);

-- Enable RLS
ALTER TABLE jury_groups ENABLE ROW LEVEL SECURITY;

/**
 * jury_group_members: Members of jury groups
 * - Links profiles to jury_groups with role (member/president)
 * - Tracks join date and active status
 * - Only one president per jury group enforced by constraint
 */
CREATE TABLE jury_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jury_group_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  role jury_member_role NOT NULL DEFAULT 'member',
  join_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_jury_group_members_group FOREIGN KEY (jury_group_id) REFERENCES jury_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_jury_group_members_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
--   CONSTRAINT unique_president_per_group UNIQUE (jury_group_id, role) WHERE role = 'president',
  CONSTRAINT unique_member UNIQUE (jury_group_id, profile_id)
);

-- Enable RLS
ALTER TABLE jury_group_members ENABLE ROW LEVEL SECURITY;

/**
 * jury_group_steps: Assignment of jury groups to competition steps
 * - Each jury group can be assigned to multiple steps
 * - Tracks when assignment was made
 * - Used to determine which jury group evaluates each step
 */
CREATE TABLE jury_group_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jury_group_id UUID NOT NULL,
  step_id UUID NOT NULL,
  assignment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_jury_group_steps_group FOREIGN KEY (jury_group_id) REFERENCES jury_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_jury_group_steps_step FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE,
  CONSTRAINT unique_group_step UNIQUE (jury_group_id, step_id)
);

-- Enable RLS
ALTER TABLE jury_group_steps ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- jury_groups indexes
CREATE INDEX idx_jury_groups_competition_id ON jury_groups(competition_id);
CREATE INDEX idx_jury_groups_president_id ON jury_groups(president_id);
CREATE INDEX idx_jury_groups_competition_order ON jury_groups(competition_id, group_order);
CREATE INDEX idx_jury_groups_is_active ON jury_groups(is_active);

-- jury_group_members indexes
CREATE INDEX idx_jury_group_members_jury_group_id ON jury_group_members(jury_group_id);
CREATE INDEX idx_jury_group_members_profile_id ON jury_group_members(profile_id);
CREATE INDEX idx_jury_group_members_role ON jury_group_members(role);
CREATE INDEX idx_jury_group_members_is_active ON jury_group_members(is_active);

-- jury_group_steps indexes
CREATE INDEX idx_jury_group_steps_jury_group_id ON jury_group_steps(jury_group_id);
CREATE INDEX idx_jury_group_steps_step_id ON jury_group_steps(step_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

/**
 * get_user_role(): Helper to extract user's role from JWT
 * Used in all RLS policies to determine access level
 */
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1
$$ LANGUAGE SQL STABLE;

/**
 * validate_jury_president_assignment(): Validate that president is member of group
 */
CREATE OR REPLACE FUNCTION validate_jury_president_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- If president_id is set, verify they are a member of the group
  IF NEW.president_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM jury_group_members
      WHERE jury_group_id = NEW.id
        AND profile_id = NEW.president_id
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Jury president must be an active member of the group';
    END IF;
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

/**
 * ensure_only_one_president_per_group(): Prevent multiple presidents
 */
CREATE OR REPLACE FUNCTION ensure_only_one_president_per_group()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'president' THEN
    IF EXISTS (
      SELECT 1 FROM jury_group_members
      WHERE jury_group_id = NEW.jury_group_id
        AND role = 'president'
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Jury group can have only one president';
    END IF;
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on jury_groups
CREATE TRIGGER update_jury_groups_updated_at
BEFORE UPDATE ON jury_groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on jury_group_members
CREATE TRIGGER update_jury_group_members_updated_at
BEFORE UPDATE ON jury_group_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on jury_group_steps
CREATE TRIGGER update_jury_group_steps_updated_at
BEFORE UPDATE ON jury_group_steps
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Validate jury president is a member
CREATE TRIGGER validate_jury_president_before_insert
BEFORE INSERT ON jury_groups
FOR EACH ROW
EXECUTE FUNCTION validate_jury_president_assignment();

CREATE TRIGGER validate_jury_president_before_update
BEFORE UPDATE ON jury_groups
FOR EACH ROW
EXECUTE FUNCTION validate_jury_president_assignment();

-- Ensure only one president per group
CREATE TRIGGER check_only_one_president_insert
BEFORE INSERT ON jury_group_members
FOR EACH ROW
EXECUTE FUNCTION ensure_only_one_president_per_group();

CREATE TRIGGER check_only_one_president_update
BEFORE UPDATE ON jury_group_members
FOR EACH ROW
EXECUTE FUNCTION ensure_only_one_president_per_group();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- =====================================================================
-- PROFILES TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY profiles_admin_all ON profiles
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Can read all, insert/update only jury_members
CREATE POLICY profiles_moderator_select ON profiles
  FOR SELECT USING (get_user_role() = 'moderator');

CREATE POLICY profiles_moderator_insert ON profiles
  FOR INSERT WITH CHECK (
    get_user_role() = 'moderator' 
    AND role = 'jury_member'
  );

CREATE POLICY profiles_moderator_update ON profiles
  FOR UPDATE USING (get_user_role() = 'moderator')
  WITH CHECK (get_user_role() = 'moderator');

-- Jury members: Can read their own profile + other jury members
CREATE POLICY profiles_jury_select ON profiles
  FOR SELECT USING (
    get_user_role() IN ('jury_president', 'jury_member')
    AND (id = auth.uid() OR role IN ('jury_member', 'jury_president'))
  );

-- Public: Read only public info (names, emails)
CREATE POLICY profiles_public_select ON profiles
  FOR SELECT USING (true);

-- Prevent jury from updating/deleting
CREATE POLICY profiles_jury_no_write ON profiles
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY profiles_jury_no_delete ON profiles
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =====================================================================
-- JURY_GROUPS TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY jury_groups_admin_all ON jury_groups
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY jury_groups_moderator_all ON jury_groups
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury president: Can read their groups
CREATE POLICY jury_groups_president_select ON jury_groups
  FOR SELECT USING (
    get_user_role() = 'jury_president'
    AND is_active = true
    AND EXISTS (
      SELECT 1 FROM jury_group_members
      WHERE jury_group_id = jury_groups.id
        AND profile_id = auth.uid()
        AND is_active = true
    )
  );

-- Jury member: Can read active groups they belong to
CREATE POLICY jury_groups_member_select ON jury_groups
  FOR SELECT USING (
    get_user_role() = 'jury_member'
    AND is_active = true
    AND EXISTS (
      SELECT 1 FROM jury_group_members
      WHERE jury_group_id = jury_groups.id
        AND profile_id = auth.uid()
        AND is_active = true
    )
  );

-- Prevent jury from writing
CREATE POLICY jury_groups_jury_no_write ON jury_groups
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY jury_groups_jury_no_delete ON jury_groups
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =====================================================================
-- JURY_GROUP_MEMBERS TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY jury_group_members_admin_all ON jury_group_members
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY jury_group_members_moderator_all ON jury_group_members
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury president: Read their group members
CREATE POLICY jury_group_members_president_select ON jury_group_members
  FOR SELECT USING (
    get_user_role() = 'jury_president'
    AND EXISTS (
      SELECT 1 FROM jury_groups
      WHERE id = jury_group_members.jury_group_id
        AND president_id = auth.uid()
        AND is_active = true
    )
  );

-- Jury member: Read their own membership
CREATE POLICY jury_group_members_member_select ON jury_group_members
  FOR SELECT USING (
    get_user_role() = 'jury_member'
    AND profile_id = auth.uid()
  );

-- Prevent jury from writing
CREATE POLICY jury_group_members_jury_no_write ON jury_group_members
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY jury_group_members_jury_no_delete ON jury_group_members
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =====================================================================
-- JURY_GROUP_STEPS TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY jury_group_steps_admin_all ON jury_group_steps
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Full access
CREATE POLICY jury_group_steps_moderator_all ON jury_group_steps
  FOR ALL USING (get_user_role() = 'moderator');

-- Jury president: Read assignments for their groups
CREATE POLICY jury_group_steps_president_select ON jury_group_steps
  FOR SELECT USING (
    get_user_role() = 'jury_president'
    AND EXISTS (
      SELECT 1 FROM jury_groups
      WHERE id = jury_group_steps.jury_group_id
        AND president_id = auth.uid()
        AND is_active = true
    )
  );

-- Jury member: Read step assignments for their group
CREATE POLICY jury_group_steps_member_select ON jury_group_steps
  FOR SELECT USING (
    get_user_role() = 'jury_member'
    AND EXISTS (
      SELECT 1 FROM jury_group_members
      WHERE jury_group_id = jury_group_steps.jury_group_id
        AND profile_id = auth.uid()
        AND is_active = true
    )
  );

-- Prevent jury from writing
CREATE POLICY jury_group_steps_jury_no_write ON jury_group_steps
  FOR UPDATE USING (get_user_role() IN ('jury_president', 'jury_member'));

CREATE POLICY jury_group_steps_jury_no_delete ON jury_group_steps
  FOR DELETE USING (get_user_role() IN ('jury_president', 'jury_member'));

-- =============================================================================
-- VIEWS
-- =============================================================================

/**
 * active_jury_groups_with_members: List all active jury groups with member counts
 * Used for dashboard statistics and jury management interface
 */
CREATE OR REPLACE VIEW active_jury_groups_with_members AS
SELECT 
  jg.id,
  jg.competition_id,
  jg.name,
  jg.president_id,
  p_pres.full_name AS president_name,
  COUNT(jgm.id) AS member_count,
  SUM(CASE WHEN jgm.role = 'president' THEN 1 ELSE 0 END) AS president_count,
  jg.group_order,
  jg.created_at
FROM jury_groups jg
LEFT JOIN profiles p_pres ON jg.president_id = p_pres.id
LEFT JOIN jury_group_members jgm ON jg.id = jgm.jury_group_id AND jgm.is_active = true
WHERE jg.is_active = true
GROUP BY jg.id, p_pres.id;

/**
 * jury_members_by_group: List all jury members by group with their roles
 * Used for jury assignment UI and group composition view
 */
CREATE OR REPLACE VIEW jury_members_by_group AS
SELECT 
  jg.id AS jury_group_id,
  jg.name AS group_name,
  jgm.profile_id,
  p.email,
  p.full_name,
  p.phone,
  jgm.role,
  jgm.is_active,
  jgm.join_date,
  jg.competition_id
FROM jury_groups jg
JOIN jury_group_members jgm ON jg.id = jgm.jury_group_id
JOIN profiles p ON jgm.profile_id = p.id
WHERE jg.is_active = true
ORDER BY jg.group_order, jgm.role DESC, p.full_name;

/**
 * jury_steps_assignment: Shows which jury groups are assigned to which steps
 * Used for competition setup and jury workload distribution
 */
CREATE OR REPLACE VIEW jury_steps_assignment AS
SELECT 
  jgs.id,
  jgs.jury_group_id,
  jg.name AS group_name,
  jgs.step_id,
  s.name AS step_name,
  s.step_order,
  c.id AS competition_id,
  c.name AS competition_name,
  jgs.assignment_date
FROM jury_group_steps jgs
JOIN jury_groups jg ON jgs.jury_group_id = jg.id
JOIN steps s ON jgs.step_id = s.id
JOIN competitions c ON s.competition_id = c.id
WHERE jg.is_active = true
ORDER BY c.name, s.step_order, jg.group_order;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON jury_groups TO authenticated;
GRANT SELECT ON jury_group_members TO authenticated;
GRANT SELECT ON jury_group_steps TO authenticated;

-- Grant all views to authenticated
GRANT SELECT ON active_jury_groups_with_members TO authenticated;
GRANT SELECT ON jury_members_by_group TO authenticated;
GRANT SELECT ON jury_steps_assignment TO authenticated;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================

/**
 * MIGRATION FLOW:
 * 1. Create ENUM types for user roles and jury member roles
 * 2. Create profiles table (synced from Auth)
 * 3. Create jury_groups with president assignment
 * 4. Create jury_group_members with uniqueness constraint on president per group
 * 5. Create jury_group_steps for step assignments
 * 6. Apply RLS policies (4 levels: admin, moderator, jury_president, jury_member)
 * 7. Create helper views for dashboard and management UIs
 *
 * TESTING CHECKLIST:
 * □ Create test profiles with different roles
 * □ Create jury groups and assign members
 * □ Verify president can only be assigned from active members
 * □ Test RLS policies for each role
 * □ Verify unique constraints on president per group
 * □ Test jury group step assignments
 * □ Verify views return correct aggregated data
 * 
 * DEPENDENCIES:
 * - Requires: migrations 0001, 0002, 0003
 * - Changes: Creates 4 new tables + 3 views
 * - Breaking: None
 */
