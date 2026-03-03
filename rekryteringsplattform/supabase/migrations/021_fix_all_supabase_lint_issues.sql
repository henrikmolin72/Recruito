-- =============================================
-- 021: Fix ALL Supabase lint issues (Security + Performance)
-- Resolves 12 Security + 20 Performance warnings
-- =============================================

-- =========================================================
-- SECURITY FIX 1: Enable RLS on recruiter_mandates (if exists)
-- The table was renamed to job_mandates in 015, but if the
-- old name still exists in DB, enable RLS on it too.
-- =========================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'recruiter_mandates'
  ) THEN
    EXECUTE 'ALTER TABLE public.recruiter_mandates ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

-- =========================================================
-- SECURITY FIX 2: Enable RLS on jobs (idempotent)
-- =========================================================
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- SECURITY FIX 3-8: Fix mutable search_path on all functions
-- Recreate with SET search_path = ''
-- =========================================================

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';

CREATE OR REPLACE FUNCTION public.get_company_id()
RETURNS UUID AS $$
  SELECT id FROM public.companies WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';

CREATE OR REPLACE FUNCTION public.get_recruiter_id()
RETURNS UUID AS $$
  SELECT id FROM public.recruiters WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

CREATE OR REPLACE FUNCTION public.update_job_recruiter_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.jobs SET current_recruiter_count = current_recruiter_count + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    UPDATE public.jobs SET current_recruiter_count = current_recruiter_count - 1 WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'company')::user_role,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- =========================================================
-- SECURITY FIX 9: Move pg_trgm to extensions schema
-- =========================================================
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
DECLARE
  current_schema TEXT;
BEGIN
  SELECT n.nspname INTO current_schema
  FROM pg_extension e
  JOIN pg_namespace n ON e.extnamespace = n.oid
  WHERE e.extname = 'pg_trgm';

  IF current_schema = 'public' THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END
$$;

-- =========================================================
-- SECURITY FIX 10-11: Replace overly-permissive INSERT policies
-- on activity_log and notifications with service_role-only
-- =========================================================

-- Activity log
DROP POLICY IF EXISTS "System can insert activity log" ON public.activity_log;
DROP POLICY IF EXISTS "Only service role can insert activity log" ON public.activity_log;
CREATE POLICY "Only service role can insert activity log"
  ON public.activity_log FOR INSERT WITH CHECK (
    (SELECT auth.jwt() ->> 'role') = 'service_role'
  );

-- Notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Only service role can create notifications" ON public.notifications;
CREATE POLICY "Only service role can create notifications"
  ON public.notifications FOR INSERT WITH CHECK (
    (SELECT auth.jwt() ->> 'role') = 'service_role'
  );

-- =========================================================
-- SECURITY FIX 12: HaveIBeenPwned
-- NOTE: This is a Supabase Dashboard setting, not a migration.
-- Go to: Authentication → Settings → Security →
--        Enable "Check passwords against HaveIBeenPwned"
-- =========================================================


-- =========================================================
-- =========================================================
-- PERFORMANCE FIXES: Wrap auth.<function>() in (SELECT ...)
-- This ensures the function is evaluated ONCE per query
-- instead of once per ROW.
-- =========================================================
-- =========================================================


-- ---------------------------------------------------------
-- PROFILES: Fix duplicate + optimize policies
-- ---------------------------------------------------------

-- Remove the duplicate "Authenticated users can view profiles" policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Drop and recreate "Users can view own profile" with (SELECT ...)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (
    id = (SELECT auth.uid()) OR is_admin()
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (
    id = (SELECT auth.uid())
  );


-- ---------------------------------------------------------
-- COMPANIES: Optimize policies
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Company owners can insert" ON public.companies;
CREATE POLICY "Company owners can insert"
  ON public.companies FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Company owners can update" ON public.companies;
CREATE POLICY "Company owners can update"
  ON public.companies FOR UPDATE USING (
    user_id = (SELECT auth.uid()) OR is_admin()
  );


-- ---------------------------------------------------------
-- RECRUITERS: Optimize policies
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Approved recruiters visible to all" ON public.recruiters;
CREATE POLICY "Approved recruiters visible to all"
  ON public.recruiters FOR SELECT USING (
    approval_status = 'approved'
    OR user_id = (SELECT auth.uid())
    OR is_admin()
  );

DROP POLICY IF EXISTS "Recruiters can insert own profile" ON public.recruiters;
CREATE POLICY "Recruiters can insert own profile"
  ON public.recruiters FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Recruiters can update own profile" ON public.recruiters;
CREATE POLICY "Recruiters can update own profile"
  ON public.recruiters FOR UPDATE USING (
    user_id = (SELECT auth.uid()) OR is_admin()
  );


-- ---------------------------------------------------------
-- JOBS: Optimize policies (also re-apply RLS policies)
-- ---------------------------------------------------------

-- Ensure status column exists if it somehow got lost
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN status job_status NOT NULL DEFAULT 'draft';
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
  END IF;
END
$$;

DROP POLICY IF EXISTS "Active jobs visible to all auth users" ON public.jobs;
CREATE POLICY "Active jobs visible to all auth users"
  ON public.jobs FOR SELECT USING (
    status = 'active'
    OR company_id = get_company_id()
    OR is_admin()
  );

DROP POLICY IF EXISTS "Companies can insert own jobs" ON public.jobs;
CREATE POLICY "Companies can insert own jobs"
  ON public.jobs FOR INSERT WITH CHECK (
    company_id = get_company_id()
  );

DROP POLICY IF EXISTS "Companies can update own jobs" ON public.jobs;
CREATE POLICY "Companies can update own jobs"
  ON public.jobs FOR UPDATE USING (
    company_id = get_company_id() OR is_admin()
  );


-- ---------------------------------------------------------
-- CONVERSATIONS: Optimize policies
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT USING (
    id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = (SELECT auth.uid())
    )
    OR is_admin()
  );

DROP POLICY IF EXISTS "Auth users can create conversations" ON public.conversations;
CREATE POLICY "Auth users can create conversations"
  ON public.conversations FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
  );


-- ---------------------------------------------------------
-- CONVERSATION_PARTICIPANTS: Optimize policies
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Participants can view their participation" ON public.conversation_participants;
CREATE POLICY "Participants can view their participation"
  ON public.conversation_participants FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR is_admin()
  );

DROP POLICY IF EXISTS "Auth users can join conversations" ON public.conversation_participants;
CREATE POLICY "Auth users can join conversations"
  ON public.conversation_participants FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can update own last_read" ON public.conversation_participants;
CREATE POLICY "Users can update own last_read"
  ON public.conversation_participants FOR UPDATE USING (
    user_id = (SELECT auth.uid())
  );


-- ---------------------------------------------------------
-- MESSAGES: Optimize policies
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = (SELECT auth.uid())
    )
    OR is_admin()
  );

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = (SELECT auth.uid())
    )
  );


-- ---------------------------------------------------------
-- NOTIFICATIONS: Optimize policies
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can mark own as read" ON public.notifications;
CREATE POLICY "Users can mark own as read"
  ON public.notifications FOR UPDATE USING (
    user_id = (SELECT auth.uid())
  );


-- ---------------------------------------------------------
-- ACTIVITY LOG: Optimize SELECT policy
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Only admins can view activity log" ON public.activity_log;
CREATE POLICY "Only admins can view activity log"
  ON public.activity_log FOR SELECT USING (
    is_admin()
  );


-- ---------------------------------------------------------
-- JOB MANDATES: Optimize policies
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Mandates visible to job owner and mandate recruiter" ON public.job_mandates;
CREATE POLICY "Mandates visible to job owner and mandate recruiter"
  ON public.job_mandates FOR SELECT USING (
    recruiter_id = get_recruiter_id()
    OR job_id IN (SELECT id FROM public.jobs WHERE company_id = get_company_id())
    OR is_admin()
  );

DROP POLICY IF EXISTS "Approved recruiters can claim mandates" ON public.job_mandates;
CREATE POLICY "Approved recruiters can claim mandates"
  ON public.job_mandates FOR INSERT WITH CHECK (
    recruiter_id = get_recruiter_id()
    AND EXISTS(
      SELECT 1 FROM public.recruiters
      WHERE id = get_recruiter_id()
        AND approval_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Recruiters can release own mandates" ON public.job_mandates;
CREATE POLICY "Recruiters can release own mandates"
  ON public.job_mandates FOR UPDATE USING (
    recruiter_id = get_recruiter_id() OR is_admin()
  );


-- ---------------------------------------------------------
-- CANDIDATES: Optimize policies
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Candidates visible to presenting recruiter and job company" ON public.candidates;
CREATE POLICY "Candidates visible to presenting recruiter and job company"
  ON public.candidates FOR SELECT USING (
    recruiter_id = get_recruiter_id()
    OR job_id IN (SELECT id FROM public.jobs WHERE company_id = get_company_id())
    OR is_admin()
  );

DROP POLICY IF EXISTS "Recruiters can submit candidates" ON public.candidates;
CREATE POLICY "Recruiters can submit candidates"
  ON public.candidates FOR INSERT WITH CHECK (
    recruiter_id = get_recruiter_id()
  );

DROP POLICY IF EXISTS "Recruiter and company can update candidates" ON public.candidates;
CREATE POLICY "Recruiter and company can update candidates"
  ON public.candidates FOR UPDATE USING (
    recruiter_id = get_recruiter_id()
    OR job_id IN (SELECT id FROM public.jobs WHERE company_id = get_company_id())
    OR is_admin()
  );


-- ---------------------------------------------------------
-- PLACEMENTS: Optimize policies
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Placement visible to involved parties" ON public.placements;
CREATE POLICY "Placement visible to involved parties"
  ON public.placements FOR SELECT USING (
    company_id = get_company_id()
    OR recruiter_id = get_recruiter_id()
    OR is_admin()
  );

DROP POLICY IF EXISTS "Only admins create placements" ON public.placements;
CREATE POLICY "Only admins create placements"
  ON public.placements FOR INSERT WITH CHECK (
    is_admin()
  );

DROP POLICY IF EXISTS "Only admins update placements" ON public.placements;
CREATE POLICY "Only admins update placements"
  ON public.placements FOR UPDATE USING (
    is_admin()
  );
