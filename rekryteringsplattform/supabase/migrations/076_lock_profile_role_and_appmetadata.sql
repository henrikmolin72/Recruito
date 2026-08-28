-- 076: Close the admin-role privilege escalation (security audit 2026-08-28).
--
-- C1  A BEFORE UPDATE trigger prevents any anon/authenticated session from
--     changing profiles.role. This restores the integrity of profiles.role,
--     which is_admin() and 40+ RLS policies depend on, WITHOUT changing how
--     they read it — so there is no lockout risk. The prior gap: the profiles
--     UPDATE policy is USING (id = auth.uid()) with no WITH CHECK, so a user
--     could PATCH /rest/v1/profiles {"role":"admin"} and self-promote.
-- H1  handle_new_user allowlists the self-selected signup role to
--     {company, recruiter}; 'admin' (or any junk) can no longer be assigned
--     through signup metadata.
-- Backfill  Sync auth.users.raw_app_meta_data.role from profiles.role so
--     app_metadata is the authoritative admin source for existing users (the
--     middleware/admin-layout gate now trusts app_metadata.role only).
--
-- No new tables → no GRANT block needed.

-- ---------------------------------------------------------------------------
-- C1 — profiles.role is not writable by the end user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER AS $$
DECLARE
  v_claim_role text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- request.jwt.claims is populated by PostgREST for anon / authenticated /
    -- service_role requests, and is unset for superuser/migration/dashboard
    -- contexts (which must remain able to set roles). Block only the two
    -- end-user roles; allow service_role and elevated internal contexts.
    v_claim_role := COALESCE(
      current_setting('request.jwt.claims', true)::jsonb ->> 'role',
      ''
    );
    IF v_claim_role IN ('authenticated', 'anon') THEN
      RAISE EXCEPTION 'profiles.role cannot be changed by the current user'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_prevent_profile_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

-- ---------------------------------------------------------------------------
-- H1 — signup role allowlist (never 'admin' from user-controlled metadata)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email, full_name)
  VALUES (
    NEW.id,
    (CASE
       WHEN NEW.raw_user_meta_data->>'role' IN ('company', 'recruiter')
         THEN NEW.raw_user_meta_data->>'role'
       ELSE 'company'
     END)::public.user_role,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ---------------------------------------------------------------------------
-- Backfill — app_metadata.role becomes authoritative for existing users.
-- profiles.role is now trusted (self-writes are blocked above). Existing users
-- are internal/pilot accounts as of 2026-08-28. Sanity-check before applying:
--   SELECT id, email, role FROM public.profiles WHERE role = 'admin';
-- getUser() reads the live auth record, so this takes effect immediately (no
-- re-login needed) for the middleware / admin-layout / requireAdmin gates.
-- ---------------------------------------------------------------------------
UPDATE auth.users u
SET raw_app_meta_data =
  COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role::text)
FROM public.profiles p
WHERE p.id = u.id
  AND COALESCE(u.raw_app_meta_data->>'role', '') IS DISTINCT FROM p.role::text;
