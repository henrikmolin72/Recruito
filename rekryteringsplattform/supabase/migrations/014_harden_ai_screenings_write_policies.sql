-- =============================================
-- HARDEN AI_SCREENINGS WRITE POLICIES
-- =============================================
--
-- Service role (used by server-side admin client) bypasses RLS, so client-facing
-- TRUE write policies are not needed and allow unauthorized writes if left open.

DROP POLICY IF EXISTS "System can insert ai screenings" ON public.ai_screenings;
DROP POLICY IF EXISTS "System can update ai screenings" ON public.ai_screenings;

DROP POLICY IF EXISTS "Admins can insert ai screenings" ON public.ai_screenings;
CREATE POLICY "Admins can insert ai screenings"
  ON public.ai_screenings FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update ai screenings" ON public.ai_screenings;
CREATE POLICY "Admins can update ai screenings"
  ON public.ai_screenings FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

