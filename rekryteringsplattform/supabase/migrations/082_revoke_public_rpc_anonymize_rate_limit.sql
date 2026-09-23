-- 082: anonymize_candidate (039) and consume_rate_limit (038) are SECURITY
-- DEFINER and meant for service_role only, but their migrations only revoked
-- EXECUTE from PUBLIC. Supabase's default privileges had also granted EXECUTE
-- to anon + authenticated directly, so anyone holding the public anon key
-- could call them via /rest/v1/rpc (confirmed in prod 2026-09-23): wipe any
-- candidate's PII + messages, or exhaust another user's rate-limit bucket.
-- fn_recalculate_recruiter_metrics (073) has the same exposure (no caller
-- check; lower impact — recomputes from existing data). The app calls all
-- three only through createAdminClient() (service_role).
REVOKE EXECUTE ON FUNCTION public.anonymize_candidate(uuid, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM anon, authenticated;
-- 073 never revoked PUBLIC, so EXECUTE also arrives via PUBLIC.
REVOKE EXECUTE ON FUNCTION public.fn_recalculate_recruiter_metrics(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_recalculate_recruiter_metrics(uuid) TO service_role;
