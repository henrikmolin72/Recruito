-- Recruiter KYC fields. Captures the manual approval checklist as JSONB so
-- the admin's reasoning is auditable, and so we can later report on which
-- criteria recruiters pass/fail without parsing free text.
--
-- The four boolean criteria (linkedin_verified, email_domain_match,
-- experience_credible, agreement_signed) are intentionally simple — the
-- pilot's KYC bar is "did a human admin actually look at this and decide".

ALTER TABLE recruiters
    ADD COLUMN IF NOT EXISTS kyc_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;

-- Index on existing approval_status remains the primary filter; the JSONB
-- field is for audit/reporting only and doesn't need its own index yet.

-- For readability when querying the table directly.
COMMENT ON COLUMN recruiters.kyc_checklist IS
    'Boolean criteria the admin confirmed at approval time. Keys: linkedin_verified, email_domain_match, experience_credible, agreement_signed. Optional free-text notes under "notes".';

COMMENT ON COLUMN recruiters.kyc_rejection_reason IS
    'Required when approval_status is rejected — explains why the recruiter was not approved. Free text, max 1000 chars enforced at the application layer.';
