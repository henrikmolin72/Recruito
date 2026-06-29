# Recruito Work-Log — 2026 H1 (build → 2026-06-29, migrations through 061)

Backfilled from git history. Each section = one milestone; SHAs are the load-bearing commits.

## 2026-02 — Initial scaffold & landing
- Scaffolded the full app with all pages and mock data, then wired real data, pipeline controls, chat, and mobile nav (`a62b1ac`, `93532c9`).
- Added the fee/commission calculator (spreadsheet model), two separate login buttons for företag/rekryterare, and the 50+-field job-posting form (`4881577`, `bd0c788`, `96911a7`).
- Shipped full i18n with 4 locales (sv/en/da/no) and the candidate workflow state machine (`f15265a`, `27dd581`).
- Volume-tier pricing, admin panel, and first security-hardening pass (`14de0f8`); hardened AI screening writes and abuse controls (`c417ab0`).

## 2026-03 — Calculator, job form, candidate submission
- Reworked the calculator to the spreadsheet commission formulas and currency (SEK→EUR), embedded it into job-form step 1 (`5d64703`, `86c89e7`, `ceaebe9`).
- Restructured the job form to 7 steps with a Declaration step; added coming-soon gate + preview-token bypass in middleware (`b840a7f`, `c2ee333`, `55617c0`).
- Built the 6-section candidate submission form and the referral-link flow (`6cf16c2`, `9f7d845`).
- Security/lint rounds: resolved 32 Supabase security+perf lint issues, enabled RLS on `jobs`, renamed `recruiter_mandates`→`job_mandates` (`90c17e6`, `5622480`).

## 2026-04 — Admin dashboard, analytics, compliance & fee re-confirm
- Admin dashboard, analytics, notifications, and security hardening (`ebb3f7d`); company analytics dashboard and guarantee automation (`cf422de`, `534bac6`).
- EU AI Act compliance, skills taxonomy + skill-tagging editor, and talent pool (`a99dd6a`, `c12ea8e`).
- Client fee re-confirmation flow end to end — DB columns, types, helper, server actions, UI, i18n, and snapshot-on-submit (`0646ce5`, `7c5bca3`, `5f4011f`, `487a61d`, `132026f`, `88bda3a`, `817ff06`); stale-prop gate bug fixed (`3a4b982`).
- Locked client+recruiter fees per job, per-job submission cap, duplicate-candidate detection, and a security review pass (IDOR, error leakage, MIME, CSV injection, CSP) (`3ccf930`, `8a56b03`, `ca25d27`, `b069d02`).

## 2026-05 — Compliance sprint, email, auth gating, mandate expiry
- Sprint A: observability (Sentry + `/api/health` + CI build gate), KYC checklist gate, cookie consent, Privacy/GDPR pages, right-to-erasure + data export, DPA + pilot docs (`89f7e03`, `a06a330`, `3340941`, `70e47e4`, `7a56261`, `37b3f80`, `8bb6eb5`). See [[Work-Log/2026-06-25-compliance-gap-analysis]].
- Email: Resend as primary provider with SMTP fallback, Tier-1 transactional emails on every notification, and missing status-email triggers + opt-out (`eb7a49e`, `710c3f7`, `1254ad3`).
- Auth: block suspended/pending recruiters at login; recruiter signup confirmation + thank-you page (`60c4c93`, `ccedb66`).
- Mandate lifecycle: 10-day mandate expiry + cron, expiry auto-release + retake cycle, job pause/reopen workflow, and screening take-action reject/submit (`cb6e9ad`, `4aad83b`, `9cbbbfc`, `748b7fa`). See [[Decisions/2026-06-01-mandate-expiry-recycle]].
- Established the Supabase public-schema GRANT default and moved destructive cleanup out of `supabase/migrations/` (`611e831`, `e7b4860`). See [[Decisions/2026-05-27-supabase-public-grant-default]] and [[Decisions/2026-05-23-dev-reset-out-of-migrations]].

## 2026-06 — Candidate stage engine, screening/AI eval, messaging, security & admin
- **Stage-progression engine**: spec-aligned candidate workflow — Recruito-gated review, company admin-approval gate, withdraw reasons, block-withdraw-after-hire, and audit stage history (migrations 052/053) (`dfdd721`, `413553c`, `80ac445`, `d8e7f33`). See [[Decisions/2026-06-14-candidate-stage-progression-engine]] and [[Decisions/2026-06-11-candidate-status-predicate-consolidation]].
- **Screening / AI evaluation**: candidate pre-submission AI eval (copy-prompt + server eval), AI report surfaced on the screening queue, Recruito-owned match score, and auto-run eval on Recruito approval (`7098c4f`, `5ca37a6`, `db57ab4`, `31fab21`).
- **Messaging**: repaired in-app messaging (RLS chicken-and-egg on conversation creation), admin Recruito inbox, recruiter support channel, and split the shared Recruito chat into private per-party threads (migrations 055/060/061) (`4a2db89`, `d5d00d8`, `3eb1f91`, `d62f98d`). See [[Decisions/2026-06-22-messaging-rls-service-role-creation]] and [[Decisions/2026-06-24-split-recruito-threads]].
- **Security hardening rounds**: auth/IDOR/CSV-injection/upload/refund-math holes, dep CVE upgrades, CV storage lockdown, auth rate-limiting, financial audit-trail, and dropped the broad CV storage SELECT policy (migrations 054/059) (`9ed4302`, `abe865f`, `2b24b3c`). See [[Decisions/2026-06-21-auth-hardening-and-cv-storage-lockdown]].
- **RLS recursion outage**: recruiter job-read-via-mandate (056) triggered jobs-policy infinite recursion (42P17) breaking company+recruiter login; fixed by 057/058 (`b4711fc`, `c5fc887`). See [[Decisions/2026-06-23-rls-recursion-jobs-policy-outage]] and [[Decisions/2026-06-22-recruiter-mandate-job-read-rls]].
- **i18n + admin dashboard**: localized all dashboard components across en/sv/da/no; admin Candidate Screening table sorting, corrected dashboard revenue source-of-truth, and excluded drafts from candidate counts (`11f2e63`, `6625cd8`, `948844d`). See [[Decisions/2026-06-22-i18n-dashboard-sweep]] and [[Decisions/2026-06-28-admin-revenue-source-of-truth]].
- **Shared candidate view + paused-job gates**: read-only candidate view reused by recruiter & admin, pipeline withdraw, unified active-recruiter counts, and blocked new referrals / presenting candidates on paused jobs (`d4dab13`, `7ddcf38`, `72d02cf`, `46b8a30`). See [[Decisions/2026-06-22-legacy-candidate-empty-state]].
