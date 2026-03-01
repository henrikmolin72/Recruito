-- =============================================
-- FIX: Supabase security linter warnings
-- =============================================

-- -------------------------------------------------
-- 1. Move pg_trgm extension out of public schema
-- -------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- -------------------------------------------------
-- 2. Recreate helper functions with fixed search_path
-- -------------------------------------------------

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

-- -------------------------------------------------
-- 3. Fix overly permissive RLS policies
--    Replace WITH CHECK (true) → service_role only
-- -------------------------------------------------

-- Notifications: drop the permissive policy, ensure strict one exists
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Only service role can create notifications" ON notifications;
CREATE POLICY "Only service role can create notifications"
  ON notifications FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role'
  );

-- Activity log: drop the permissive policy, ensure strict one exists
DROP POLICY IF EXISTS "System can insert activity log" ON activity_log;
DROP POLICY IF EXISTS "Only service role can insert activity log" ON activity_log;
CREATE POLICY "Only service role can insert activity log"
  ON activity_log FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role'
  );
