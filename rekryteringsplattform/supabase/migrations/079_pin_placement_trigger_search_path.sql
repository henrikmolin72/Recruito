-- 079: pin search_path on the last SECURITY DEFINER function flagged by the
-- Supabase linter (function_search_path_mutable). Attribute-only change — no
-- body/logic change, so placement behavior is unaffected. (Audit 2026-08-28, L9.)
ALTER FUNCTION public.fn_auto_create_placement() SET search_path = public, pg_temp;
