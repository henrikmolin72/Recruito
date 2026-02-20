-- =============================================
-- HARDEN SECURITY POLICIES FOR PRODUCTION
-- =============================================

-- Restore strict mandate-claim policy (approved recruiters only)
DROP POLICY IF EXISTS "Recruiters can claim mandates" ON job_mandates;
DROP POLICY IF EXISTS "Approved recruiters can claim mandates" ON job_mandates;

CREATE POLICY "Approved recruiters can claim mandates"
  ON job_mandates FOR INSERT WITH CHECK (
    recruiter_id = get_recruiter_id()
    AND EXISTS(
      SELECT 1
      FROM recruiters
      WHERE id = get_recruiter_id()
        AND approval_status = 'approved'
    )
  );

-- Prevent arbitrary notification creation by end users
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Only service role can create notifications" ON notifications;

CREATE POLICY "Only service role can create notifications"
  ON notifications FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role'
  );

-- Prevent arbitrary activity log creation by end users
DROP POLICY IF EXISTS "System can insert activity log" ON activity_log;
DROP POLICY IF EXISTS "Only service role can insert activity log" ON activity_log;

CREATE POLICY "Only service role can insert activity log"
  ON activity_log FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role'
  );
