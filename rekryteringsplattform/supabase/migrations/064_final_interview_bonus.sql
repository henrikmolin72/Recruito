-- Optional recruiter incentive: employer may opt in on the declaration step to pay
-- €100 to the recruiter when a submitted candidate reaches the final interview.
-- Previously worded as a mandatory declaration bullet; now a per-job opt-in checkbox.
-- Existing rows default to false (not participating).
-- Existing `jobs` grants cover the new column — no additional GRANT needed.

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS final_interview_bonus boolean NOT NULL DEFAULT false;
