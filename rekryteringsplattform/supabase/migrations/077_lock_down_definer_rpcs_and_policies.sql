-- 077: Lock down SECURITY DEFINER RPCs and over-permissive RLS policies
-- (security audit 2026-08-28, findings H3/H4/M7/M1/M3/M4).
--
-- Every call site was traced first: the functions revoked below are invoked
-- only via the service-role (admin) client or not at all; claim_mandate is the
-- one authenticated-callable RPC and is hardened in-body instead of revoked.
-- No new tables → no GRANT block needed.

-- ===========================================================================
-- H3 — dead money-path SECURITY DEFINER functions are client-callable RPCs.
-- No app call sites (superseded by placements.ts). A client could POST
-- /rest/v1/rpc/fn_handle_guarantee_failure to self-refund. Revoke from all
-- end-user roles (triggers/cron run as owner and are unaffected) and pin
-- search_path.
-- ===========================================================================
REVOKE ALL ON FUNCTION public.fn_handle_guarantee_failure(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_process_guarantee_expirations()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_handle_guarantee_failure(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_process_guarantee_expirations() TO service_role;
ALTER FUNCTION public.fn_handle_guarantee_failure(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_process_guarantee_expirations() SET search_path = public, pg_temp;

-- ===========================================================================
-- M7 — approve_application / reject_application are SECURITY DEFINER, trust a
-- caller-supplied p_recruiter_id, and are called ONLY via the admin client
-- (applications.ts) after the server action authorizes. Revoke end-user
-- EXECUTE so the param can't be abused directly; pin search_path.
-- ===========================================================================
REVOKE ALL ON FUNCTION public.approve_application(uuid, uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_application(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_application(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_application(uuid, uuid) TO service_role;
ALTER FUNCTION public.approve_application(uuid, uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.reject_application(uuid, uuid) SET search_path = public, pg_temp;

-- ===========================================================================
-- H4 — claim_mandate is authenticated-callable (recruiter.ts) and must stay so,
-- but it trusted p_recruiter_id, letting a recruiter claim as someone else or
-- while pending/suspended. Harden the body: the recruiter is derived from the
-- session and must be approved; the supplied id must match. Signature and grant
-- unchanged (the legitimate caller passes its own recruiter id, so the happy
-- path is identical).
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.claim_mandate(p_job_id uuid, p_recruiter_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max    int;
    v_count  int;
    v_exists int;
BEGIN
    -- Identity comes from the session, never from the caller-supplied id.
    IF p_recruiter_id IS DISTINCT FROM public.get_recruiter_id() THEN
        RAISE EXCEPTION 'not authorized to claim a mandate for another recruiter'
          USING ERRCODE = 'insufficient_privilege';
    END IF;
    -- Only approved recruiters may claim (the approval gate the direct-insert
    -- RLS policy enforced, restored here).
    IF NOT EXISTS (
        SELECT 1 FROM public.recruiters
         WHERE id = p_recruiter_id AND approval_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'recruiter is not approved to claim mandates'
          USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Row lock serializes concurrent claims on the same job.
    SELECT max_recruiters INTO v_max FROM public.jobs WHERE id = p_job_id FOR UPDATE;
    IF v_max IS NULL THEN
        RETURN 'notfound';
    END IF;

    SELECT count(*) INTO v_count
      FROM public.job_mandates
     WHERE job_id = p_job_id AND is_active = true;

    SELECT count(*) INTO v_exists
      FROM public.job_mandates
     WHERE job_id = p_job_id AND recruiter_id = p_recruiter_id AND is_active = true;

    IF v_exists > 0 THEN
        RETURN 'already';
    END IF;

    IF v_count >= v_max THEN
        RETURN 'full';
    END IF;

    INSERT INTO public.job_mandates (job_id, recruiter_id, is_active)
    VALUES (p_job_id, p_recruiter_id, true);

    RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_mandate(uuid, uuid) TO authenticated;

-- ===========================================================================
-- M1 — conversation_participants INSERT policy allowed any authenticated user
-- to add THEMSELVES to any conversation (participant injection → cross-tenant
-- message read/write). All legitimate participant inserts go through the
-- service-role (admin) client, which bypasses RLS. Drop the permissive INSERT
-- policy; authenticated keeps SELECT + last_read_at UPDATE.
-- ===========================================================================
DROP POLICY IF EXISTS "Auth users can join conversations" ON public.conversation_participants;

-- ===========================================================================
-- M3 — EU AI Act audit/bias tables accepted forged rows (WITH CHECK (TRUE)).
-- ai_audit_log is written only via the admin client; ai_bias_reports is not
-- written by the app at all. Drop the permissive write policies (service-role
-- bypasses RLS); SELECT policies remain.
-- ===========================================================================
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.ai_audit_log;
DROP POLICY IF EXISTS "Service role can manage bias reports" ON public.ai_bias_reports;

-- ===========================================================================
-- M4 — guarantee_breach_reports let a company self-edit admin-review/refund
-- columns (FOR ALL). All writes go through the admin client; companies only
-- need to READ their own reports. Downgrade the company policy to SELECT.
-- ===========================================================================
DROP POLICY IF EXISTS "Companies manage their breach reports" ON public.guarantee_breach_reports;
CREATE POLICY "Companies can view their breach reports"
  ON public.guarantee_breach_reports FOR SELECT
  USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = (SELECT auth.uid()))
  );
