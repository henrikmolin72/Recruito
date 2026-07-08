-- =============================================
-- HARDEN AI_SCREENINGS WRITE POLICIES
-- =============================================
--
-- Service role (used by server-side admin client) bypasses RLS, so client-facing
-- TRUE write policies are not needed and allow unauthorized writes if left open.
--
-- Guarded (2026-07-08): ai_screenings pre-existed only in prod and is first
-- created by migration 023, so on a fresh database this migration must no-op —
-- 023 creates the table with equivalent admin-only write policies.
-- See Dev-Notes/local-supabase-stack-gotchas.md. Re-running on prod is a no-op
-- semantically (same drop/create statements as the original).

DO $$
BEGIN
  IF to_regclass('public.ai_screenings') IS NULL THEN
    RAISE NOTICE 'ai_screenings missing (fresh DB) — skipping 014; 023 applies equivalent policies';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "System can insert ai screenings" ON public.ai_screenings';
  EXECUTE 'DROP POLICY IF EXISTS "System can update ai screenings" ON public.ai_screenings';

  EXECUTE 'DROP POLICY IF EXISTS "Admins can insert ai screenings" ON public.ai_screenings';
  EXECUTE 'CREATE POLICY "Admins can insert ai screenings"
    ON public.ai_screenings FOR INSERT
    WITH CHECK (is_admin())';

  EXECUTE 'DROP POLICY IF EXISTS "Admins can update ai screenings" ON public.ai_screenings';
  EXECUTE 'CREATE POLICY "Admins can update ai screenings"
    ON public.ai_screenings FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin())';
END $$;
