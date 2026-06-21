-- =============================================
-- 054 — Tighten CV storage read access (security)
-- =============================================
--
-- Problem: the original SELECT policy on the private `cvs` bucket
-- (003_storage_buckets.sql) was:
--     bucket_id = 'cvs' AND auth.uid() IS NOT NULL
-- i.e. ANY authenticated user (any company, any recruiter) could read ANY
-- candidate CV directly via the Storage API if they knew/guessed the object
-- path. The only real gate was application-layer authorization.
--
-- Fix: CVs are now read exclusively via the service-role (admin) client through
-- short-lived signed URLs, AFTER ownership/authorization is enforced in
-- application code:
--   * company candidate page  -> getCandidate() verifies job ownership, then
--                                signs with the admin client
--   * admin candidate page    -> admin client
--   * screening / screening-report / data-rights -> admin client
-- Dropping the broad authenticated-read policy makes the storage layer
-- fail-closed: user-scoped (anon/authenticated) clients can no longer read CV
-- objects directly. The service-role client bypasses RLS and is unaffected, so
-- legitimate signed-URL generation and downloads keep working.
--
-- The INSERT policy ("Recruiters upload CVs") is intentionally left in place —
-- uploads still happen through user-scoped clients.

DROP POLICY IF EXISTS "Authorized users view CVs" ON storage.objects;

-- No GRANT needed: this removes a policy and creates no new public table.
