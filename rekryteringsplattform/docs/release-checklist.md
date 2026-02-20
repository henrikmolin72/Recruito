# Recruito Production Release Checklist

Updated: 2026-02-19

## 1. Environment and Domains
- [ ] Production domain is live (DNS, TLS certificate, redirect from www/non-www decided).
- [ ] Hosting env vars are set:
  - [ ] `NEXT_PUBLIC_APP_URL` (production URL, e.g. `https://app.recruito.se`)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Supabase Auth settings updated:
  - [ ] Site URL set to production URL
  - [ ] Redirect URLs include `https://<domain>/callback` and `https://<domain>/reset-password`

## 2. Database and Migrations
- [ ] Run all migrations in production database.
- [ ] Explicitly confirm these are applied:
  - [ ] `005_add_paused_candidate_status.sql`
  - [ ] `006_ensure_paused_candidate_status.sql`
  - [ ] `007_harden_security_policies.sql`
- [ ] Verify paused enum exists by running a read query filtering `candidates.status = 'paused'`.
- [ ] Verify notification insert policy is locked to service role.
- [ ] Verify mandate claim policy requires approved recruiters.

## 3. Security
- [ ] Service role key is only present on server runtime (never in client bundle).
- [ ] Rotate Supabase keys if previously exposed.
- [ ] `api/debug` is inaccessible in production.
- [ ] RLS is enabled on all tables and policies behave as expected.

## 4. Functional Smoke Test (prod-like data)
- [ ] Company registration/login works.
- [ ] Recruiter registration/login works.
- [ ] Admin can approve/reject recruiters.
- [ ] Unapproved recruiter cannot claim mandate.
- [ ] Approved recruiter can claim mandate.
- [ ] Recruiter can submit candidate with CV.
- [ ] Company can update candidate status.
- [ ] Chat works both directions.
- [ ] Notifications appear for both roles.
- [ ] Password reset flow works (`/forgot-password` -> email -> `/reset-password`).

## 5. Legal and SEO
- [ ] Legal pages are published and reviewed:
  - [ ] `/anvandarvillkor`
  - [ ] `/integritetspolicy`
  - [ ] `/gdpr`
- [ ] `robots.txt` is correct for production.
- [ ] `sitemap.xml` is reachable.

## 6. Observability and Operations
- [ ] Error monitoring enabled (e.g. Sentry).
- [ ] Uptime monitor + alerting enabled.
- [ ] Backup/PITR confirmed in Supabase.
- [ ] Rollback plan documented (previous deployment + DB migration strategy).

## 7. Post-Launch (within 24h)
- [ ] Monitor auth errors and failed server actions.
- [ ] Monitor database errors and policy denials.
- [ ] Validate email delivery rate and spam folder behavior.
- [ ] Review first real user funnel: signup -> activation -> first candidate submission.
