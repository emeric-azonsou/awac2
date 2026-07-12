-- =============================================================================
-- AWAC MONO - Migration 0008: Notifications & Audit Logging
-- =============================================================================
-- Tables:
--   1. notifications: User notifications for events
--   2. audit_logs: Complete audit trail of all actions
--
-- Features:
--   - Real-time notification system
--   - Multiple notification types (info, warning, success, error)
--   - Actionable notifications with URLs
--   - Read/unread tracking
--   - Complete audit logging for compliance
--   - JSON-based change tracking
--   - IP address and user agent logging for security
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE notification_type AS ENUM (
  'info',              -- Informational message
  'warning',           -- Warning (action recommended)
  'success',           -- Operation successful
  'error'              -- Error occurred
);

CREATE TYPE audit_action AS ENUM (
  'create',
  'read',
  'update',
  'delete',
  'publish',
  'approve',
  'reject',
  'verify',
  'sign',
  'lock',
  'revoke'
);

-- =============================================================================
-- TABLES
-- =============================================================================

/**
 * notifications: User-facing notifications
 * - Per-user notifications for events
 * - Competition-specific or global notifications
 * - Read tracking for inbox management
 * - Action URLs for quick navigation
 * - Used for alerts, confirmations, reminders
 */
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL,
  competition_id UUID,
  
  -- Notification content
  notification_type notification_type NOT NULL DEFAULT 'info',
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  
  -- Read status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_notif_recipient FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_competition FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  CONSTRAINT subject_not_empty CHECK (LENGTH(TRIM(subject)) > 0),
  CONSTRAINT message_not_empty CHECK (LENGTH(TRIM(message)) > 0)
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

/**
 * audit_logs: Complete audit trail for compliance and debugging
 * - Records all significant actions in the system
 * - changes JSON field stores old → new values
 * - IP address and user agent for security analysis
 * - Can be used for compliance reporting and forensics
 */
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  competition_id UUID,
  
  -- Action details
  action audit_action NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  
  -- Data changes (JSON)
  changes JSONB,
  
  -- Security info
  ip_address INET,
  user_agent TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_competition FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL,
  CONSTRAINT resource_type_not_empty CHECK (LENGTH(TRIM(resource_type)) > 0)
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- notifications indexes
CREATE INDEX idx_notif_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notif_competition_id ON notifications(competition_id);
CREATE INDEX idx_notif_is_read ON notifications(is_read);
CREATE INDEX idx_notif_type ON notifications(notification_type);
CREATE INDEX idx_notif_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notif_recipient_read ON notifications(recipient_id, is_read);
CREATE INDEX idx_notif_recipient_comp ON notifications(recipient_id, competition_id);

-- audit_logs indexes
CREATE INDEX idx_audit_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_competition_id ON audit_logs(competition_id);
CREATE INDEX idx_audit_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_actor_comp ON audit_logs(actor_id, competition_id);
CREATE INDEX idx_audit_resource_type_id ON audit_logs(resource_type, resource_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

/**
 * notify_user(): Send notification to user
 * Helper function to create notifications
 */
CREATE OR REPLACE FUNCTION notify_user(
  p_recipient_id UUID,
  p_notification_type notification_type,
  p_subject VARCHAR,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_competition_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notif_id UUID;
BEGIN
  INSERT INTO notifications (
    recipient_id, 
    notification_type, 
    subject, 
    message, 
    action_url, 
    competition_id
  ) VALUES (
    p_recipient_id,
    p_notification_type,
    p_subject,
    p_message,
    p_action_url,
    p_competition_id
  ) RETURNING id INTO v_notif_id;
  
  RETURN v_notif_id;
END
$$ LANGUAGE plpgsql;

/**
 * log_audit(): Create audit log entry
 * Helper function for audit trail
 */
CREATE OR REPLACE FUNCTION log_audit(
  p_actor_id UUID,
  p_action audit_action,
  p_resource_type VARCHAR,
  p_resource_id UUID,
  p_changes JSONB DEFAULT NULL,
  p_competition_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    changes,
    competition_id,
    ip_address,
    user_agent
  ) VALUES (
    p_actor_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_changes,
    p_competition_id,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END
$$ LANGUAGE plpgsql;

/**
 * mark_notification_read(): Mark notification as read
 */
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = true,
      read_at = NOW()
  WHERE id = p_notification_id
    AND is_read = false;
END
$$ LANGUAGE plpgsql;

/**
 * mark_all_notifications_read(): Mark all user notifications as read
 */
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE notifications
  SET is_read = true,
      read_at = NOW()
  WHERE recipient_id = p_user_id
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Log certificate status changes
CREATE OR REPLACE FUNCTION log_certificate_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_audit(
      auth.uid(),
      'update'::audit_action,
      'certificates',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      NEW.competition_id
    );
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Log signature creation
CREATE OR REPLACE FUNCTION log_signature_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_audit(
    NEW.signer_id,
    'sign'::audit_action,
    'signatures',
    NEW.id,
    jsonb_build_object(
      'signature_type', NEW.signature_type,
      'certificate_id', NEW.certificate_id
    )
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Log candidate score submissions
CREATE OR REPLACE FUNCTION log_score_submission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.validated IS DISTINCT FROM OLD.validated THEN
    PERFORM log_audit(
      NEW.validated_by,
      'verify'::audit_action,
      'candidate_scores',
      NEW.id,
      jsonb_build_object(
        'score', NEW.score,
        'validated', NEW.validated,
        'criterion_id', NEW.criterion_id
      ),
      (SELECT competition_id FROM steps WHERE id = NEW.step_id)
    );
  ELSIF NEW.is_edited IS DISTINCT FROM OLD.is_edited THEN
    PERFORM log_audit(
      NEW.edited_by,
      'update'::audit_action,
      'candidate_scores',
      NEW.id,
      jsonb_build_object(
        'old_score', OLD.score,
        'new_score', NEW.score
      ),
      (SELECT competition_id FROM steps WHERE id = NEW.step_id)
    );
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging
CREATE TRIGGER audit_certificate_status_change
AFTER UPDATE ON certificates
FOR EACH ROW
EXECUTE FUNCTION log_certificate_status_change();

CREATE TRIGGER audit_signature_creation
AFTER INSERT ON signatures
FOR EACH ROW
EXECUTE FUNCTION log_signature_creation();

CREATE TRIGGER audit_score_submission
AFTER UPDATE ON candidate_scores
FOR EACH ROW
EXECUTE FUNCTION log_score_submission();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- =====================================================================
-- NOTIFICATIONS TABLE POLICIES
-- =====================================================================

-- Admins: Full access
CREATE POLICY notif_admin_all ON notifications
  FOR ALL USING (get_user_role() = 'administrator');

-- Moderators: Can read all, create system notifications
CREATE POLICY notif_moderator_select ON notifications
  FOR SELECT USING (get_user_role() = 'moderator');

CREATE POLICY notif_moderator_insert ON notifications
  FOR INSERT WITH CHECK (get_user_role() = 'moderator');

-- Users: Read only their own notifications
CREATE POLICY notif_user_select ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY notif_user_update ON notifications
  FOR UPDATE USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Prevent deletion
CREATE POLICY notif_no_delete ON notifications
  FOR DELETE USING (false);

-- =====================================================================
-- AUDIT_LOGS TABLE POLICIES
-- =====================================================================

-- Admins: Full read access
CREATE POLICY audit_admin_select ON audit_logs
  FOR SELECT USING (get_user_role() = 'administrator');

-- Moderators: Read audit logs
CREATE POLICY audit_moderator_select ON audit_logs
  FOR SELECT USING (get_user_role() = 'moderator');

-- Jury: No direct access (audit logs server-created)
CREATE POLICY audit_jury_blocked ON audit_logs
  FOR ALL USING (false);

-- System: Can insert (server-side only)
CREATE POLICY audit_system_insert ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Prevent modification of audit logs
CREATE POLICY audit_no_update ON audit_logs
  FOR UPDATE USING (false);

CREATE POLICY audit_no_delete ON audit_logs
  FOR DELETE USING (false);

-- =============================================================================
-- VIEWS
-- =============================================================================

/**
 * user_notification_summary: Unread notification counts per user
 * Used for badge counts and notification UI
 */
CREATE OR REPLACE VIEW user_notification_summary AS
SELECT 
  recipient_id,
  COUNT(DISTINCT id) AS total_notifications,
  COUNT(DISTINCT CASE WHEN is_read = false THEN id END) AS unread_count,
  COUNT(DISTINCT CASE WHEN notification_type = 'error' THEN id END) AS error_count,
  COUNT(DISTINCT CASE WHEN notification_type = 'warning' THEN id END) AS warning_count,
  MAX(created_at) AS last_notification_at
FROM notifications
GROUP BY recipient_id;

/**
 * audit_activity_summary: Audit activity statistics
 * Used for system monitoring and compliance reporting
 */
CREATE OR REPLACE VIEW audit_activity_summary AS
SELECT 
  DATE(created_at) AS activity_date,
  resource_type,
  action,
  COUNT(DISTINCT id) AS action_count,
  COUNT(DISTINCT actor_id) AS unique_actors,
  COUNT(DISTINCT competition_id) AS competitions_affected
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), resource_type, action
ORDER BY activity_date DESC, action_count DESC;

/**
 * user_activity_log: Detailed activity per user
 * Used for security audits and user action history
 */
CREATE OR REPLACE VIEW user_activity_log AS
SELECT 
  a.id,
  p.email,
  p.full_name,
  a.action,
  a.resource_type,
  a.resource_id,
  c.name AS competition_name,
  a.created_at,
  a.ip_address,
  a.user_agent
FROM audit_logs a
LEFT JOIN profiles p ON a.actor_id = p.id
LEFT JOIN competitions c ON a.competition_id = c.id
ORDER BY a.created_at DESC;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- Grant views to authenticated
GRANT SELECT ON user_notification_summary TO authenticated;
GRANT SELECT ON audit_activity_summary TO authenticated;
GRANT SELECT ON user_activity_log TO authenticated;

-- Public can insert audit logs (server-managed)
GRANT INSERT ON audit_logs TO anon;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================

/**
 * MIGRATION FLOW:
 * 1. Create ENUM types for notification types and audit actions
 * 2. Create notifications table
 * 3. Create audit_logs table
 * 4. Create helper functions (notify_user, log_audit, mark_read)
 * 5. Create triggers for automatic audit logging
 * 6. Apply RLS policies (read-only for audit logs)
 * 7. Create views for activity monitoring
 *
 * TESTING CHECKLIST:
 * □ Create test notifications
 * □ Mark notifications as read
 * □ Verify unread count accuracy
 * □ Perform audit-triggering actions (certificate status, signature)
 * □ Verify audit logs created automatically
 * □ Test RLS: users can read only own notifications
 * □ Test RLS: admin can read all audit logs
 * □ Test audit log immutability (no updates/deletes)
 * □ Verify views aggregate correctly
 * □ Check IP address and user agent logging
 * 
 * DEPENDENCIES:
 * - Requires: migrations 0001-0007
 * - Changes: Creates 2 new tables + 3 views
 * - Breaking: None
 * 
 * NOTES:
 * - Audit logs are immutable and append-only (good for compliance)
 * - Notifications support real-time updates via Supabase Realtime
 * - Audit trails track: actor, action, resource, changes, IP, user agent
 * - Notifications can be typed (error, warning, success, info) for UI
 * - Changes field in audit_logs stores old/new values for compliance
 */
