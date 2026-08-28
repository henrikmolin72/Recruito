-- 078: Protect company billing PII from non-owners (security audit 2026-08-28, M2).
--
-- The companies SELECT row policy is USING (TRUE) — intentional, because company
-- names/industry are shown on job listings to recruiters and the public. But
-- that also exposed billing_email, billing_address, org_number, and
-- stripe_customer_id to every authenticated user (rival companies, recruiters)
-- and to anon.
--
-- Fix with COLUMN-level privileges rather than a row-policy change (which would
-- break the legitimate name/industry reads): revoke table-wide SELECT from the
-- end-user roles and grant back only the non-PII columns. The owner and admin
-- read billing through the service-role (admin) client, which keeps full SELECT
-- (getCompanyProfile / dashboard were repointed to the admin client;
-- getAdminCompanyById / data-rights already used it).
--
-- NOTE for future migrations: a new column added to public.companies is NOT
-- selectable by anon/authenticated until added to the GRANT below (mirrors the
-- project's explicit-grant rule for new tables). Add it here unless it is PII.

REVOKE SELECT ON public.companies FROM anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  company_name,
  description,
  industry,
  website,
  logo_url,
  city,
  country,
  employee_count,
  is_verified,
  created_at,
  updated_at,
  candidate_profile_notice_accepted,
  approval_status,
  approved_at,
  approved_by
) ON public.companies TO anon, authenticated;

-- The service-role (admin) client keeps full read, including the PII columns.
GRANT SELECT ON public.companies TO service_role;
