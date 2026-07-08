-- Migration: Enhance applications table for referral link flow
-- Adds screening answers, consent tracking, and review status for recruiter-side candidate review
--
-- Guarded (2026-07-08): applications pre-existed only in prod and is first
-- created by migration 023 (which includes all of these columns and replaces the
-- indexes below with unique ones), so on a fresh database this migration must
-- no-op. See Dev-Notes/local-supabase-stack-gotchas.md. Re-running on prod is a
-- no-op (all statements are IF NOT EXISTS, as in the original).

DO $$
BEGIN
  IF to_regclass('public.applications') IS NULL THEN
    RAISE NOTICE 'applications missing (fresh DB) — skipping 022; 023 creates the table with these columns';
    RETURN;
  END IF;

  -- Add screening_answers JSONB to store candidate responses to job screening questions
  EXECUTE $sql$ALTER TABLE applications ADD COLUMN IF NOT EXISTS screening_answers JSONB DEFAULT '[]'::jsonb$sql$;

  -- Add consent_given to track candidate declaration/consent
  EXECUTE $sql$ALTER TABLE applications ADD COLUMN IF NOT EXISTS consent_given BOOLEAN NOT NULL DEFAULT false$sql$;

  -- Add review columns for recruiter review before client submission
  EXECUTE $sql$ALTER TABLE applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ$sql$;
  EXECUTE $sql$ALTER TABLE applications ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id)$sql$;

  -- Add cv_file_path directly on applications (was previously only in metadata)
  EXECUTE $sql$ALTER TABLE applications ADD COLUMN IF NOT EXISTS cv_file_path TEXT$sql$;

  -- Ensure status can hold the new review states
  -- Existing statuses: 'new', plus whatever AI screening sets
  -- We add: 'recruiter_approved', 'recruiter_rejected', 'submitted_to_client'
  -- Using TEXT status so no enum migration needed

  -- Index for duplicate detection: fast lookup by email + job_id
  EXECUTE $sql$CREATE INDEX IF NOT EXISTS idx_applications_email_job ON applications (email, job_id) WHERE email IS NOT NULL$sql$;

  -- Index for duplicate detection: fast lookup by linkedin_url + job_id
  EXECUTE $sql$CREATE INDEX IF NOT EXISTS idx_applications_linkedin_job ON applications (linkedin_url, job_id) WHERE linkedin_url IS NOT NULL$sql$;
END $$;
