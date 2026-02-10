-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_company_id()
RETURNS UUID AS $$
  SELECT id FROM companies WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_recruiter_id()
RETURNS UUID AS $$
  SELECT id FROM recruiters WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- PROFILES
-- =============================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

-- =============================================
-- COMPANIES
-- =============================================

CREATE POLICY "Anyone can view companies"
  ON companies FOR SELECT USING (TRUE);

CREATE POLICY "Company owners can insert"
  ON companies FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Company owners can update"
  ON companies FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- =============================================
-- RECRUITERS
-- =============================================

CREATE POLICY "Approved recruiters visible to all"
  ON recruiters FOR SELECT USING (approval_status = 'approved' OR user_id = auth.uid() OR is_admin());

CREATE POLICY "Recruiters can insert own profile"
  ON recruiters FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Recruiters can update own profile"
  ON recruiters FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- =============================================
-- JOBS
-- =============================================

CREATE POLICY "Active jobs visible to all auth users"
  ON jobs FOR SELECT USING (
    status = 'active'
    OR company_id = get_company_id()
    OR is_admin()
  );

CREATE POLICY "Companies can insert own jobs"
  ON jobs FOR INSERT WITH CHECK (company_id = get_company_id());

CREATE POLICY "Companies can update own jobs"
  ON jobs FOR UPDATE USING (company_id = get_company_id() OR is_admin());

-- =============================================
-- JOB MANDATES
-- =============================================

CREATE POLICY "Mandates visible to job owner and mandate recruiter"
  ON job_mandates FOR SELECT USING (
    recruiter_id = get_recruiter_id()
    OR job_id IN (SELECT id FROM jobs WHERE company_id = get_company_id())
    OR is_admin()
  );

CREATE POLICY "Approved recruiters can claim mandates"
  ON job_mandates FOR INSERT WITH CHECK (
    recruiter_id = get_recruiter_id()
    AND EXISTS(SELECT 1 FROM recruiters WHERE id = get_recruiter_id() AND approval_status = 'approved')
  );

CREATE POLICY "Recruiters can release own mandates"
  ON job_mandates FOR UPDATE USING (
    recruiter_id = get_recruiter_id() OR is_admin()
  );

-- =============================================
-- CANDIDATES
-- =============================================

CREATE POLICY "Candidates visible to presenting recruiter and job company"
  ON candidates FOR SELECT USING (
    recruiter_id = get_recruiter_id()
    OR job_id IN (SELECT id FROM jobs WHERE company_id = get_company_id())
    OR is_admin()
  );

CREATE POLICY "Recruiters can submit candidates"
  ON candidates FOR INSERT WITH CHECK (
    recruiter_id = get_recruiter_id()
  );

CREATE POLICY "Recruiter and company can update candidates"
  ON candidates FOR UPDATE USING (
    recruiter_id = get_recruiter_id()
    OR job_id IN (SELECT id FROM jobs WHERE company_id = get_company_id())
    OR is_admin()
  );

-- =============================================
-- PLACEMENTS
-- =============================================

CREATE POLICY "Placement visible to involved parties"
  ON placements FOR SELECT USING (
    company_id = get_company_id()
    OR recruiter_id = get_recruiter_id()
    OR is_admin()
  );

CREATE POLICY "Only admins create placements"
  ON placements FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Only admins update placements"
  ON placements FOR UPDATE USING (is_admin());

-- =============================================
-- MESSAGES
-- =============================================

CREATE POLICY "Participants can view conversations"
  ON conversations FOR SELECT USING (
    id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Auth users can create conversations"
  ON conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can view their participation"
  ON conversation_participants FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Auth users can join conversations"
  ON conversation_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own last_read"
  ON conversation_participants FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- NOTIFICATIONS
-- =============================================

CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT WITH CHECK (TRUE); -- Created by server/triggers

CREATE POLICY "Users can mark own as read"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- ACTIVITY LOG
-- =============================================

CREATE POLICY "Only admins can view activity log"
  ON activity_log FOR SELECT USING (is_admin());

CREATE POLICY "System can insert activity log"
  ON activity_log FOR INSERT WITH CHECK (TRUE);
