-- Server-side candidate drafts.
-- A recruiter can save a partially-filled candidate as a draft (status='draft')
-- and resume/submit/delete it later from the mandate's Draft column. Drafts are
-- never visible to the client (recruito_screened_at stays null), never queued to
-- Recruito, and do not count toward the per-job submission cap.
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'draft';
