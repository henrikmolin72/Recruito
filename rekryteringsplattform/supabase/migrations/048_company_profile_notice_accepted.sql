-- Candidate profile access confirmation: one-time popup acknowledgement.
--
-- Before a client (company) opens a candidate profile for the first time, a
-- confirmation popup explains that viewing notifies the recruiter. The client
-- accepts ONCE per company; thereafter profiles open directly. This boolean
-- records that company-level acceptance.
--
-- ALTER on an existing app-facing table — existing GRANTs apply, no new GRANT.

ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS candidate_profile_notice_accepted boolean NOT NULL DEFAULT false;
