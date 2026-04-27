-- Recruitment Process Flow gates (steps 4, 7, 11)
-- Step 4: Job Activation requires Recruito approval before recruiters can see it
-- Step 7: Recruito Screening — mark candidates as internally screened
-- Step 11: Sync candidate.status with company offer/hire stage transitions

-- Step 4: pending_approval state for jobs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'job_status'::regtype
          AND enumlabel = 'pending_approval'
    ) THEN
        ALTER TYPE job_status ADD VALUE 'pending_approval' BEFORE 'active';
    END IF;
END $$;

-- Step 7: Recruito screening tracking on candidates
ALTER TABLE candidates
    ADD COLUMN IF NOT EXISTS recruito_screened_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS recruito_screened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_recruito_screened_at
    ON candidates(recruito_screened_at)
    WHERE recruito_screened_at IS NULL;
