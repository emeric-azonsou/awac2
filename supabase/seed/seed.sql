-- =============================================================================
-- AWAC MONO - Seed Data & Demo Configuration
-- =============================================================================
-- This file contains:
--   - Default system configurations
--   - Demo competition setup
--   - Sample data for testing
--   - Certificate types and templates
-- =============================================================================

-- =============================================================================
-- DISABLE TRIGGERS DURING SEED (Optional - Comment out if needed)
-- =============================================================================

-- Disable triggers temporarily to speed up seed import
-- ALTER TABLE candidates DISABLE TRIGGER audit_candidates;
-- ALTER TABLE candidate_scores DISABLE TRIGGER audit_scores;

-- =============================================================================
-- CERTIFICATE TYPES
-- =============================================================================

-- Insert certificate types (run once per competition)
INSERT INTO certificate_types (
  id,
  competition_id,
  name,
  description,
  is_active,
  created_by
) SELECT
  uuid_generate_v4(),
  competitions.id,
  cert_type,
  description,
  true,
  auth.uid()
FROM competitions
CROSS JOIN (
  VALUES 
    ('Participation', 'Certificate awarded to all registered candidates'),
    ('Winner', 'Certificate awarded to top 3 finalists'),
    ('Special Award', 'Certificate for special jury recognitions'),
    ('Jury Certificate', 'Certificate of participation for jury members')
) AS cert_types(cert_type, description)
WHERE competitions.name LIKE 'AWAC%'
  AND NOT EXISTS (
    SELECT 1 FROM certificate_types ct
    WHERE ct.competition_id = competitions.id
      AND ct.name = cert_types.cert_type
  );

-- =============================================================================
-- CERTIFICATE TEMPLATES
-- =============================================================================

-- Insert HTML templates for each certificate type
INSERT INTO certificate_templates (
  id,
  certificate_type_id,
  template_name,
  template_content,
  is_active,
  created_by
) SELECT
  uuid_generate_v4(),
  ct.id,
  'Template v1.0',
  CASE ct.name
    WHEN 'Participation' THEN 
      '<div class="certificate"><h1>Certificate of Participation</h1><p>This certifies that {{candidate_name}} has participated in {{competition_name}} {{year}}</p></div>'
    WHEN 'Winner' THEN 
      '<div class="certificate"><h1>Certificate of Excellence</h1><p>This certifies that {{candidate_name}} achieved {{rank}} place in {{competition_name}} {{year}}</p></div>'
    WHEN 'Special Award' THEN 
      '<div class="certificate"><h1>Special Recognition</h1><p>This certifies that {{candidate_name}} received the {{award_name}} award in {{competition_name}} {{year}}</p></div>'
    ELSE 
      '<div class="certificate"><h1>Certificate of Jury Service</h1><p>This certifies that {{jury_name}} served as jury member for {{competition_name}} {{year}}</p></div>'
  END AS template_content,
  true,
  auth.uid()
FROM certificate_types ct
WHERE NOT EXISTS (
  SELECT 1 FROM certificate_templates ctpl
  WHERE ctpl.certificate_type_id = ct.id
);

-- =============================================================================
-- DEMO DATA (Only run if starting fresh)
-- =============================================================================

-- Create demo competition (if none exists)
INSERT INTO competitions (
  id,
  name,
  description,
  start_date,
  end_date,
  registration_start,
  registration_end,
  status,
  logo_url,
  created_by
) VALUES (
  uuid_generate_v4(),
  'AWAC 2026',
  'AWAC Competition 2026 - Demo Edition',
  NOW(),
  NOW() + INTERVAL '6 months',
  NOW() - INTERVAL '1 month',
  NOW() + INTERVAL '1 month',
  'planning'::competition_status,
  'https://example.com/logo.png',
  auth.uid()
) ON CONFLICT DO NOTHING;

-- Create demo steps
INSERT INTO steps (
  id,
  competition_id,
  name,
  description,
  step_order,
  percentage,
  status,
  created_by
) 
SELECT 
  uuid_generate_v4(),
  c.id,
  step_data.name,
  step_data.description,
  step_data.step_order,
  step_data.percentage,
  'draft'::step_status,
  auth.uid()
FROM competitions c
CROSS JOIN (
  VALUES
    ('Presentation', 'Initial presentation round', 1, 30),
    ('Technical', 'Technical skills evaluation', 2, 40),
    ('Final', 'Final round and decision', 3, 30)
) AS step_data(name, description, step_order, percentage)
WHERE c.name = 'AWAC 2026'
  AND NOT EXISTS (
    SELECT 1 FROM steps s
    WHERE s.competition_id = c.id
      AND s.name = step_data.name
  );

-- Create demo jury groups
INSERT INTO jury_groups (
  id,
  competition_id,
  name,
  description,
  group_order,
  is_active,
  created_by
) 
SELECT 
  uuid_generate_v4(),
  c.id,
  'Jury Group ' || group_num,
  'Demo jury group ' || group_num,
  group_num,
  true,
  auth.uid()
FROM competitions c
CROSS JOIN (SELECT * FROM (VALUES (1), (2), (3)) AS t(group_num)) AS groups
WHERE c.name = 'AWAC 2026'
  AND NOT EXISTS (
    SELECT 1 FROM jury_groups jg
    WHERE jg.competition_id = c.id
  );

-- Create demo jury group assignments to steps
INSERT INTO jury_group_steps (
  id,
  jury_group_id,
  step_id
)
SELECT 
  uuid_generate_v4(),
  jg.id,
  s.id
FROM jury_groups jg
CROSS JOIN steps s
WHERE jg.competition_id IN (SELECT id FROM competitions WHERE name = 'AWAC 2026')
  AND s.competition_id = jg.competition_id
  AND NOT EXISTS (
    SELECT 1 FROM jury_group_steps jgs
    WHERE jgs.jury_group_id = jg.id
      AND jgs.step_id = s.id
  );

-- Create demo candidates (sample data)
INSERT INTO candidates (
  id,
  competition_id,
  first_name,
  last_name,
  email,
  phone,
  gender,
  category,
  workshop_name,
  commune,
  status,
  registration_date,
  created_by
)
SELECT
  uuid_generate_v4(),
  c.id,
  candidate_data.first_name,
  candidate_data.last_name,
  candidate_data.email,
  candidate_data.phone,
  candidate_data.gender,
  candidate_data.category,
  candidate_data.workshop,
  candidate_data.commune,
  'registered'::candidate_status,
  NOW(),
  auth.uid()
FROM competitions c
CROSS JOIN (
  VALUES
    ('Alice', 'Martin', 'alice@example.com', '+237123456789', 'female', 'Fashion', 'Atelier Mode', 'Douala'),
    ('Bob', 'Nguema', 'bob@example.com', '+237123456790', 'male', 'Arts', 'Studio Art', 'Yaoundé'),
    ('Carla', 'Endema', 'carla@example.com', '+237123456791', 'female', 'Fashion', 'Design Studio', 'Douala'),
    ('Daniel', 'Mballa', 'daniel@example.com', '+237123456792', 'male', 'Arts', 'Creative Space', 'Yaoundé'),
    ('Emma', 'Anoh', 'emma@example.com', '+237123456793', 'female', 'Fashion', 'Fashion House', 'Buea'),
    ('Frank', 'Kimbi', 'frank@example.com', '+237123456794', 'male', 'Arts', 'Gallery Studio', 'Douala'),
    ('Grace', 'Njie', 'grace@example.com', '+237123456795', 'female', 'Fashion', 'Boutique Design', 'Yaoundé'),
    ('Henry', 'Obi', 'henry@example.com', '+237123456796', 'male', 'Arts', 'Artist Studio', 'Buea'),
    ('Ivy', 'Ebot', 'ivy@example.com', '+237123456797', 'female', 'Fashion', 'Design Atelier', 'Douala'),
    ('Jack', 'Talla', 'jack@example.com', '+237123456798', 'male', 'Arts', 'Creative Hub', 'Yaoundé')
) AS candidate_data(first_name, last_name, email, phone, gender, category, workshop, commune)
WHERE c.name = 'AWAC 2026'
  AND NOT EXISTS (
    SELECT 1 FROM candidates cand
    WHERE cand.competition_id = c.id
      AND cand.email = candidate_data.email
  );

-- Create demo criteria for first step
INSERT INTO criteria (
  id,
  step_id,
  name,
  description,
  weight,
  min_score,
  max_score,
  criterion_order,
  is_active,
  created_by
)
SELECT
  uuid_generate_v4(),
  s.id,
  criterion_data.name,
  criterion_data.description,
  criterion_data.weight,
  0,
  20,
  criterion_data.order,
  true,
  auth.uid()
FROM steps s
CROSS JOIN (
  VALUES
    ('Creativity', 'Originality and creativity of the work', 40, 1),
    ('Technical Skill', 'Technical execution and skill', 30, 2),
    ('Presentation', 'Quality of presentation', 30, 3)
) AS criterion_data(name, description, weight, order)
WHERE s.competition_id IN (SELECT id FROM competitions WHERE name = 'AWAC 2026')
  AND s.name = 'Presentation'
  AND NOT EXISTS (
    SELECT 1 FROM criteria c
    WHERE c.step_id = s.id
      AND c.name = criterion_data.name
  );

-- Create candidate assignments
INSERT INTO candidate_assignments (
  id,
  candidate_id,
  step_id,
  jury_group_id,
  passage_order,
  status,
  created_by
)
SELECT
  uuid_generate_v4(),
  cand.id,
  s.id,
  jg.id,
  ROW_NUMBER() OVER (PARTITION BY s.id, jg.id ORDER BY cand.id),
  'pending'::assignment_status,
  auth.uid()
FROM candidates cand
CROSS JOIN steps s
CROSS JOIN jury_groups jg
WHERE cand.competition_id IN (SELECT id FROM competitions WHERE name = 'AWAC 2026')
  AND s.competition_id = cand.competition_id
  AND jg.competition_id = cand.competition_id
  AND s.name = 'Presentation'
  AND NOT EXISTS (
    SELECT 1 FROM candidate_assignments ca
    WHERE ca.candidate_id = cand.id
      AND ca.step_id = s.id
      AND ca.jury_group_id = jg.id
  );

-- =============================================================================
-- DEMO SPECIAL AWARDS
-- =============================================================================

INSERT INTO special_awards (
  id,
  competition_id,
  name,
  description,
  award_order,
  is_active,
  created_by
)
SELECT
  uuid_generate_v4(),
  c.id,
  award_data.name,
  award_data.description,
  award_data.order,
  true,
  auth.uid()
FROM competitions c
CROSS JOIN (
  VALUES
    ('Best Creativity', 'Award for most creative work', 1),
    ('Audience Favorite', 'Award voted by audience', 2),
    ('Most Innovative', 'Award for most innovative concept', 3)
) AS award_data(name, description, order)
WHERE c.name = 'AWAC 2026'
  AND NOT EXISTS (
    SELECT 1 FROM special_awards sa
    WHERE sa.competition_id = c.id
      AND sa.name = award_data.name
  );

-- =============================================================================
-- DEMO PROFILE DATA (Admin & Jury Members)
-- =============================================================================

-- Create demo admin user (if auth.uid() exists)
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_by
) VALUES (
  auth.uid(),
  'admin@awac.local',
  'Administrator',
  'administrator'::user_role,
  true,
  auth.uid()
) ON CONFLICT DO NOTHING;

-- Create demo jury president profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  phone,
  role,
  is_active,
  created_by
) 
SELECT
  uuid_generate_v4(),
  'jury' || group_num || '@awac.local',
  'Jury President ' || group_num,
  '+237123456' || (800 + group_num),
  'jury_president'::user_role,
  true,
  auth.uid()
FROM (SELECT * FROM (VALUES (1), (2), (3)) AS t(group_num)) AS groups;

-- Assign jury presidents to groups
UPDATE jury_groups jg
SET president_id = (
  SELECT id FROM profiles p
  WHERE p.email = 'jury' || (ROW_NUMBER() OVER (ORDER BY jg.id)) || '@awac.local'
  LIMIT 1
)
WHERE president_id IS NULL
  AND competition_id IN (SELECT id FROM competitions WHERE name = 'AWAC 2026');

-- Create jury group members
INSERT INTO jury_group_members (
  id,
  jury_group_id,
  profile_id,
  role,
  is_active
)
SELECT
  uuid_generate_v4(),
  jg.id,
  p.id,
  'member'::jury_member_role,
  true
FROM jury_groups jg
CROSS JOIN profiles p
WHERE jg.competition_id IN (SELECT id FROM competitions WHERE name = 'AWAC 2026')
  AND p.role = 'jury_member'::user_role
  AND NOT EXISTS (
    SELECT 1 FROM jury_group_members jgm
    WHERE jgm.jury_group_id = jg.id
      AND jgm.profile_id = p.id
  )
LIMIT 3;

-- =============================================================================
-- DEMO NOTIFICATIONS
-- =============================================================================

-- Create welcome notifications
INSERT INTO notifications (
  recipient_id,
  notification_type,
  subject,
  message,
  competition_id
)
SELECT
  p.id,
  'info'::notification_type,
  'Welcome to AWAC 2026',
  'Welcome! You have been assigned as jury member for AWAC 2026.',
  c.id
FROM profiles p
CROSS JOIN competitions c
WHERE c.name = 'AWAC 2026'
  AND p.role IN ('jury_member', 'jury_president')
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.recipient_id = p.id
      AND n.competition_id = c.id
      AND n.subject = 'Welcome to AWAC 2026'
  );

-- =============================================================================
-- RE-ENABLE TRIGGERS
-- =============================================================================

-- ALTER TABLE candidates ENABLE TRIGGER audit_candidates;
-- ALTER TABLE candidate_scores ENABLE TRIGGER audit_scores;

-- =============================================================================
-- SEED DATA SUMMARY
-- =============================================================================

/*
 * DEMO DATA CREATED:
 * - 1 Competition (AWAC 2026)
 * - 3 Steps (Presentation, Technical, Final)
 * - 3 Jury Groups
 * - 10 Demo Candidates
 * - 3 Criteria for Presentation step
 * - 90 Candidate Assignments (10 candidates × 3 steps × 3 groups)
 * - 3 Special Awards
 * - 3 Jury Presidents + 3 Members
 * - Certificate Types (4) with HTML templates
 *
 * HOW TO USE:
 * 1. This seed runs on migration (auto-generated)
 * 2. Admin can access /admin dashboard
 * 3. Jury members see /jury interface
 * 4. Modify demo data by editing VALUES clauses
 * 5. Add more candidate fixtures as needed
 *
 * DATA ISOLATION:
 * - All demo data linked to "AWAC 2026" competition
 * - Uses ON CONFLICT DO NOTHING to prevent duplicates
 * - Safe to run multiple times
 */
