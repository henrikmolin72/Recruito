-- Per-job cap on candidate submissions (client-requested, default 8).
-- Recruiters cannot submit beyond max_candidates until admin raises the cap.
-- Admin adjusts via /admin/jobs editor.
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS max_candidates INTEGER NOT NULL DEFAULT 8
  CHECK (max_candidates > 0);
