-- Recruiter "withdraw candidate" flow.
-- A recruiter can no longer reject a candidate; instead they withdraw it with a
-- structured reason. Status becomes 'candidate_withdrawn' (already in the enum);
-- these columns capture the reason + timestamp.
--
-- Column additions on an existing table inherit the table's grants, so no
-- additional GRANT is required (candidates is already exposed to authenticated).

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS withdraw_reason TEXT,
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;
