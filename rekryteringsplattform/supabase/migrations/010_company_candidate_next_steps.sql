-- =============================================
-- COMPANY NEXT-STEP REQUESTS ON CANDIDATES
-- =============================================

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS company_requested_next_step TEXT;

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS company_requested_next_step_note TEXT;

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS company_requested_next_step_at TIMESTAMPTZ;

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS company_requested_next_step_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_candidates_company_requested_next_step'
  ) THEN
    ALTER TABLE candidates
    ADD CONSTRAINT chk_candidates_company_requested_next_step
    CHECK (
      company_requested_next_step IS NULL
      OR company_requested_next_step IN (
        'request_tests',
        'pause_candidate',
        'reject_candidate',
        'proceed_to_hire'
      )
    );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_candidates_company_requested_next_step
ON candidates(company_requested_next_step)
WHERE company_requested_next_step IS NOT NULL;
