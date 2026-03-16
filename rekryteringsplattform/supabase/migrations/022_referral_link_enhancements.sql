-- Migration: Enhance applications table for referral link flow
-- Adds screening answers, consent tracking, and review status for recruiter-side candidate review

-- Add screening_answers JSONB to store candidate responses to job screening questions
ALTER TABLE applications ADD COLUMN IF NOT EXISTS screening_answers JSONB DEFAULT '[]'::jsonb;

-- Add consent_given to track candidate declaration/consent
ALTER TABLE applications ADD COLUMN IF NOT EXISTS consent_given BOOLEAN NOT NULL DEFAULT false;

-- Add review columns for recruiter review before client submission
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

-- Add cv_file_path directly on applications (was previously only in metadata)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cv_file_path TEXT;

-- Ensure status can hold the new review states
-- Existing statuses: 'new', plus whatever AI screening sets
-- We add: 'recruiter_approved', 'recruiter_rejected', 'submitted_to_client'
-- Using TEXT status so no enum migration needed

-- Index for duplicate detection: fast lookup by email + job_id
CREATE INDEX IF NOT EXISTS idx_applications_email_job ON applications (email, job_id) WHERE email IS NOT NULL;

-- Index for duplicate detection: fast lookup by linkedin_url + job_id
CREATE INDEX IF NOT EXISTS idx_applications_linkedin_job ON applications (linkedin_url, job_id) WHERE linkedin_url IS NOT NULL;
