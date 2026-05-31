-- Step 7 (Recruito Screening) "Take action": admin can Reject a submission
-- before it reaches the client. Submit-to-client is the existing
-- recruito_screened_at gate (see migration 030 + mandate-stages.ts).
-- Reject sets a terminal status and records a reason; the candidate is never
-- screened, so it stays out of the client's view.

-- New terminal status for an admin/Recruito screening rejection.
-- (ALTER TYPE ADD VALUE must be committed before the value is used at runtime,
--  which it is — the app only writes this value in a later request.)
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'recruito_rejected';

-- Reject metadata on candidates (mirrors the recruito_screened_* columns).
ALTER TABLE candidates
    ADD COLUMN IF NOT EXISTS recruito_rejected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS recruito_rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS recruito_reject_reason TEXT;
