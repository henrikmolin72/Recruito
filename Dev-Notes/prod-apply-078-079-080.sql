-- =====================================================================
-- Recruito prod: apply migrations 078 → 079 → 080 (one paste, in order)
-- Generated 2026-09-06 from rekryteringsplattform/supabase/migrations/.
-- All three are idempotent: safe to re-run if a step already succeeded.
--
-- PRE-FLIGHT (run first, must return the expected values or STOP — wrong project):
--   select to_regclass('public.candidate_stage_history') as stage_history,       -- expect: candidate_stage_history (migration 052)
--          to_regclass('public.presence_sessions') as presence;             -- expect: NULL before 080, presence_sessions after
-- =====================================================================


-- ---------- 078_companies_billing_pii_column_grants.sql ----------
-- 078: Protect company billing PII from non-owners (security audit 2026-08-28, M2).
--
-- The companies SELECT row policy is USING (TRUE) — intentional, because company
-- names/industry are shown on job listings to recruiters and the public. But
-- that also exposed billing_email, billing_address, org_number, and
-- stripe_customer_id to every authenticated user (rival companies, recruiters)
-- and to anon.
--
-- Fix with COLUMN-level privileges rather than a row-policy change (which would
-- break the legitimate name/industry reads): revoke table-wide SELECT from the
-- end-user roles and grant back only the non-PII columns. The owner and admin
-- read billing through the service-role (admin) client, which keeps full SELECT
-- (getCompanyProfile / dashboard were repointed to the admin client;
-- getAdminCompanyById / data-rights already used it).
--
-- NOTE for future migrations: a new column added to public.companies is NOT
-- selectable by anon/authenticated until added to the GRANT below (mirrors the
-- project's explicit-grant rule for new tables). Add it here unless it is PII.

REVOKE SELECT ON public.companies FROM anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  company_name,
  description,
  industry,
  website,
  logo_url,
  city,
  country,
  employee_count,
  is_verified,
  created_at,
  updated_at,
  candidate_profile_notice_accepted,
  approval_status,
  approved_at,
  approved_by
) ON public.companies TO anon, authenticated;

-- The service-role (admin) client keeps full read, including the PII columns.
GRANT SELECT ON public.companies TO service_role;


-- ---------- 079_pin_placement_trigger_search_path.sql ----------
-- 079: pin search_path on the last SECURITY DEFINER function flagged by the
-- Supabase linter (function_search_path_mutable). Attribute-only change — no
-- body/logic change, so placement behavior is unaffected. (Audit 2026-08-28, L9.)
ALTER FUNCTION public.fn_auto_create_placement() SET search_path = public, pg_temp;


-- ---------- 080_presence_sessions.sql ----------
-- 080: presence tracking for the admin "Recruiters online | Companies online"
-- header counter and its /admin/presence history page (client ask 2026-09-04).
--
-- One row per user "session": the dashboard heartbeat (every 60 s while the tab
-- is visible) extends the latest row's last_seen_at, or starts a new row after
-- a 15-minute gap. "Online" = last_seen_at within the last 5 minutes. Only
-- recruiter/company users are recorded; admins are never counted.
--
-- Service-role-only: read/written exclusively via createAdminClient(). We grant
-- the service_role DML explicitly (NOT authenticated/anon) so the table stays
-- unreachable with a user JWT while the server actions always work. This is
-- deliberate: service_role bypasses RLS but NOT table GRANTs (rolbypassrls=t,
-- rolsuper=f), and a fresh DB whose default privileges don't cover service_role
-- otherwise fails every read/write with "permission denied for table" (verified
-- on the local stack 2026-09-04). Deleting a profile cascades its sessions.
CREATE TABLE IF NOT EXISTS public.presence_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presence_sessions_last_seen
  ON public.presence_sessions (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_presence_sessions_user_last_seen
  ON public.presence_sessions (user_id, last_seen_at DESC);

ALTER TABLE public.presence_sessions ENABLE ROW LEVEL SECURITY;

-- Server-side access only. No authenticated/anon grant → RLS-on + no-policy keeps
-- the table invisible to user JWTs; the service_role grant keeps createAdminClient working.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presence_sessions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.presence_sessions_id_seq TO service_role;


-- =====================================================================
-- POST-CHECK (all three must hold):
--   select to_regclass('public.presence_sessions') is not null as t080;                          -- true
--   select count(*) = 1 as t078 from information_schema.role_table_grants
--     where table_name = 'companies' and grantee = 'service_role' and privilege_type = 'SELECT';   -- true (service_role full SELECT re-granted)
--   select proconfig from pg_proc where proname = 'fn_auto_create_placement';               -- {search_path=public, pg_temp}
-- Then reload the admin dashboard: the header pill reads "Recruiters online: 0 | Companies online: 0" instead of "—".
-- =====================================================================
