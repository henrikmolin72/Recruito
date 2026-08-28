-- =============================================
-- RECRUITER LEGAL ELIGIBILITY CONFIRMATION
-- Captured at registration (Yes/No). FALSE = answered "No" or legacy row.
-- =============================================

ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS legal_eligibility_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
