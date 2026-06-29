# Database & Migrations — As-Built (2026-06-29, migrations through 061)

> Current-state companion to the original build spec [[Architecture/02-DATABASE-SCHEMA]]. The spec is the frozen April plan; this note is what the code actually does now.

## What it does today

- **Postgres on Supabase**, schema driven entirely by ordered SQL files in `supabase/migrations/` (`001` → `061`; **`011` is absent** — a numbering gap, not a missing file). Migrations are append-only and almost all idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS … CREATE`, `ADD VALUE IF NOT EXISTS`).
- **Core marketplace model** (`001`): `profiles` (1:1 with `auth.users`) → `companies` / `recruiters`, `jobs`, `job_mandates` (a recruiter's claim on a job), `candidates` (a recruiter's submission), `placements` (the hire + money), plus `conversations`/`messages`, `notifications`, `activity_log`.
- **Row Level Security on every table.** Access is computed through `SECURITY DEFINER` helpers — `is_admin()`, `get_company_id()`, `get_recruiter_id()`, `auth_role()` (`002`, hardened in `016`/`021` with `SET search_path = ''`). Later helpers `recruiter_holds_job_mandate()` (`057`) and `company_owns_job()` (`058`) exist specifically to break RLS recursion (see Notable changes).
- **Service-role tables.** Audit/internal tables (`rate_limits` `038`, `audit_log` `039`, `candidate_screenings` `047`, `candidate_stage_history` writes `052`) have RLS enabled with **no INSERT policy and no GRANT** — only `createAdminClient()` (service role, bypasses RLS) writes them. App-facing tables get explicit `GRANT … TO authenticated` per [[Decisions/2026-05-27-supabase-public-grant-default]].
- **Triggers/functions**: `handle_new_user()` auto-creates a profile on signup; `update_updated_at()` stamps `updated_at`; `update_job_recruiter_count()` maintains `jobs.current_recruiter_count`; `fn_auto_create_placement()` mints a placement when a candidate hits `hired` (`018`). Atomic RPCs: `consume_rate_limit()` (`038`), `anonymize_candidate()` (`039`), `claim_mandate()` (`053`).
- **Storage**: private `cvs` bucket + public `avatars`/`logos` (`003`). CV direct-read via RLS was fully removed (`054`, `059`) — CVs now only reachable through server-generated signed URLs after app-layer auth.

## Key files

- `supabase/migrations/001_initial_schema.sql` — all core tables, enums, triggers, `handle_new_user`.
- `supabase/migrations/002_rls_policies.sql` — the RLS baseline + the four helper functions.
- `supabase/migrations/016_…` / `021_fix_all_supabase_lint_issues.sql` — security-linter hardening (search_path, extension schema, service-role-only writes).
- `supabase/migrations/057_fix_jobs_rls_recursion.sql` + `058_decouple_rls_cross_table_subqueries.sql` — the recursion fix and its defense-in-depth follow-up.
- `src/types/db-types.ts` — hand-maintained TS types. **Not generated** from the DB; it drifts and must be edited alongside migrations. Source of truth for the app's `JobStatus` / `CandidateStatus` unions.

## Data model / migrations

Tables by area, with the migrations that shaped them:

- **Identity & orgs** — `profiles`, `companies`, `recruiters` (`001`). Recruiter onboarding fields (`012`), perf metrics (`018`), KYC checklist (`040`). Company admin-approval gate `approval_status` (`051`), profile-notice acceptance (`048`).
- **Jobs** — `jobs` (`001`); massively widened by `017` (full job spec: location/work-type/salary/benefits/requirements), `019` (management/key-requirements/language/interview), `025` announcements, `032` `max_candidates` cap, `033` locked fees (`client_fee_amount`/`recruiter_fee_amount` become source of truth), `034` client-fee re-confirm flow, `035` `team_size` int→text, `043` pause/reopen reasons. `recruiter_fee_percentage` added `026`.
- **Mandates** — `job_mandates` (`001`; renamed from `recruiter_mandates` in `015`). `045` swaps `UNIQUE(job_id,recruiter_id)` for a partial unique index so a recruiter can retake a recycled job (one *active* mandate). `046` adds per-mandate AI-eval config. `053` adds atomic `claim_mandate()` RPC.
- **Candidates** — `candidates` (`001`); pipeline stage (`008`), company next-step (`010`), extended submission fields (`020`), placement linkage + guarantee dates (`018`), Recruito screening stamps (`030`) + reject (`044`), withdraw (`049`), draft (`050`). `candidate_interviews`/`_events` (`009`), `candidate_stage_history` (`052`).
- **Placements** — `placements` (`001`); automation/guarantee columns (`018`), guarantee breach + reminder tables (`029`).
- **AI / compliance** — `ai_screenings` + `applications` (formally created `023`, referral enhancements `022`), EU-AI-Act audit (`027`: `ai_audit_log`, `ai_bias_reports`), `candidate_screenings` stored reports (`047`), skills taxonomy/talent pool (`028`).
- **Messaging** — `conversations`/`messages` (`001`); `conversation_type` captured into VCS (`055`), thread split into private `recruito_company`/`recruito_recruiter` channels (`060`), candidate-less recruiter↔Recruito support thread via `owner_user_id` (`061`).
- **GDPR / ops** — `rate_limits` (`038`), `audit_log` + `data_rights_requests` + `anonymize_candidate()` (`039`), notification i18n keys (`041`), email opt-out (`037`), mandate-expiry dedupe stamp (`042`).

### Enum evolution
- `job_status`: spec enum (`001`) gained `pending_approval` (`030`) and `pending_client_reconfirm` (`034`).
- `candidate_status`: started 9 values (`001`); grew via `005`/`006` (`paused`), `013` (18 workflow states), `044` (`recruito_rejected`), `050` (`draft`). The TS union in `db-types.ts:12` is the consolidated list.

## Migrations ledger (001 → 061)

**Schema / tables / columns**
- `001` initial_schema — core tables, enums, triggers, `handle_new_user`
- `008` pipeline_stages — `jobs.pipeline_stages` JSONB + `candidates.current_pipeline_stage`
- `009` candidate_interviews — interview rounds + event-history tables
- `010` company_candidate_next_steps — company next-step request columns on candidates
- `012` recruiter_onboarding — recruiter profile/onboarding fields + check constraints
- `017` expand_job_fields — full job-spec columns on `jobs`
- `018` placement_automation_metrics — placement/guarantee columns + `fn_auto_create_placement`
- `019` form_review_changes — management/key-requirements/language/interview job columns
- `020` candidate_submission_extended_fields — 6-section candidate form columns
- `022` referral_link_enhancements — screening answers/consent/review on `applications`
- `023` create_applications_table_and_fixes — creates `applications` + `ai_screenings`, atomic approve fn
- `024` allow_nullable_industry — `jobs.industry` nullable for drafts
- `025` job_announcements — `job_announcements` table
- `026` recruiter_fee_percentage — `jobs.recruiter_fee_percentage` (default 7.00)
- `028` skills_taxonomy — `skills`, `candidate_skills`, `job_required_skills`, `talent_pool_entries`
- `032` jobs_max_candidates_cap — `jobs.max_candidates` (default 8)
- `035` team_size_integer_to_text — `jobs.team_size` int→text brackets
- `036` expected_salary_below_reason — candidate reason column
- `040` recruiter_kyc — `recruiters.kyc_checklist` JSONB + rejection reason
- `043` job_pause_workflow — pause/close reasons + reopen-nudge stamp
- `046` mandate_eval_config — per-mandate AI-eval columns on `job_mandates`
- `048` company_profile_notice_accepted — one-time access-confirmation flag on companies
- `049` candidate_withdraw — withdraw reason/timestamp on candidates
- `051` company_approval — `companies.approval_status` admin gate

**RLS / security**
- `002` rls_policies — RLS baseline + helper functions
- `003` storage_buckets — `cvs`/`avatars`/`logos` buckets + storage policies
- `004` fix_recruiter_policy — loosened mandate-claim (dev)
- `007` harden_security_policies — restored approved-only claim; service-role-only notifications/activity
- `014` harden_ai_screenings_write_policies — admin-only write on `ai_screenings`
- `015` fix_rls_and_table_name — enable RLS on jobs; rename `recruiter_mandates`→`job_mandates`
- `016` fix_security_warnings — `search_path=''` on helpers; move `pg_trgm` to `extensions` schema
- `021` fix_all_supabase_lint_issues — sweep of 12 security + 20 perf linter warnings
- `031` fix_handle_new_user_qualified_type — schema-qualify `public.user_role` in trigger
- `038` rate_limits — `rate_limits` table + `consume_rate_limit()` (service-role)
- `039` data_rights — `audit_log`, `data_rights_requests`, `anonymize_candidate()` (GDPR)
- `054` tighten_cv_storage_select — drop broad CV-read storage policy
- `056` recruiter_mandate_job_read — recruiters keep job read access via held mandate (**caused outage**)
- `057` fix_jobs_rls_recursion — `recruiter_holds_job_mandate()` SECURITY DEFINER breaks recursion
- `058` decouple_rls_cross_table_subqueries — `company_owns_job()`; remove raw cross-table subqueries
- `059` tighten_cvs_storage_policy — re-drop CV-read storage policy (signed-URL-only)

**Workflow / stages**
- `005` / `006` add/ensure `paused` candidate status
- `013` candidate_workflow_statuses — 18 new candidate-status enum values
- `030` process_flow_gates — `pending_approval` job state + Recruito-screening stamps
- `044` recruito_screening_reject — `recruito_rejected` status + reject metadata
- `045` mandate_recycle — partial unique index; allow mandate retake after release
- `050` candidate_draft — `draft` candidate status
- `052` candidate_stage_history — immutable stage-transition audit table
- `053` claim_mandate_fn — atomic `claim_mandate()` closing the slot-cap race

**Fees**
- `033` locked_job_fees — `is_exclusive`, `client_fee_amount`, `recruiter_fee_amount` (source of truth)
- `034` client_fee_reconfirm — `pending_client_reconfirm` state + uplift/reconfirm columns

**Messaging**
- `055` conversation_type — capture `conversations.conversation_type` into VCS
- `060` split_recruito_threads — split shared Recruito thread into per-party private channels
- `061` recruiter_support_thread — `owner_user_id` for candidate-less recruiter↔Recruito threads

**Screening / AI / compliance**
- `027` ai_compliance — EU-AI-Act audit columns + `ai_audit_log` + `ai_bias_reports`
- `029` guarantee_automation — `guarantee_breach_reports` + reminder log
- `047` candidate_screenings — stored AI screening reports (service-role-only)

**Notifications / misc**
- `037` email_preferences — `email_opt_out`
- `041` notification_i18n — `title_key`/`body_key`/`params` for render-time localization
- `042` mandate_expiry_notified — dedupe stamp for the expiry cron

## Notable changes since the original plan

- **RLS recursion was a production outage.** `056` added a raw `EXISTS (SELECT … FROM job_mandates …)` subquery to the `jobs` SELECT policy; because `job_mandates`/`candidates` policies in turn read `jobs`, this created mutual recursion (`jobs → job_mandates → jobs`) that 500'd every company and recruiter login. `057` routed the check through a `SECURITY DEFINER` helper (`recruiter_holds_job_mandate`, runs without RLS) to break the cycle; `058` retrofitted the same pattern (`company_owns_job`) onto the three pre-existing raw-subquery policies as defense-in-depth. See [[Decisions/2026-06-23-rls-recursion-jobs-policy-outage]].
- **Fees moved off the calculator.** The spec computed fees from salary × percentage at read time; `033`/`034` froze them into `jobs.client_fee_amount` / `recruiter_fee_amount` as the source of truth, with a client re-confirm consent state. (Admin revenue is summed from these per-job columns, not from `placements.platform_fee` — see [[Decisions/2026-06-28-admin-revenue-source-of-truth]].)
- **`candidate_status` exploded** from 9 spec values to ~30, reflecting the real multi-stage workflow (interview stages, offer states, Recruito-screening, withdraw, draft). Predicate logic for these lives in app code, not the DB — [[Decisions/2026-06-11-candidate-status-predicate-consolidation]].
- **Mandate lifecycle gained recycling + atomicity.** `045` lets an expired/released mandate be retaken as a fresh cycle (partial unique index instead of a hard table constraint); `053` made the claim atomic under a row lock to stop two recruiters exceeding the slot cap — [[Decisions/2026-06-01-mandate-expiry-recycle]], [[Decisions/2026-06-14-candidate-stage-progression-engine]].
- **CV storage was locked down twice** (`054`, `059`): the original "any authenticated user can read any CV" storage policy was removed; CVs are now served only via short-lived service-role signed URLs after app-layer authorization — [[Decisions/2026-06-21-auth-hardening-and-cv-storage-lockdown]].
- **Messaging was re-architected.** Conversations are created via the service-role client to escape an RLS chicken-and-egg ([[Decisions/2026-06-22-messaging-rls-service-role-creation]]); the single shared "recruito" thread was split into private per-party channels ([[Decisions/2026-06-24-split-recruito-threads]]); `conversation_type` (`055`) and `owner_user_id` (`061`) were added so threads can key on user, not just candidate.
- **`000_cleanup.sql` was deliberately removed** from `supabase/migrations/` so a dev-reset script doesn't run as a real migration — [[Decisions/2026-05-23-dev-reset-out-of-migrations]].
- **Some columns exist in prod ahead of the migration that records them** (`conversation_type`, `055`) — migrations are written idempotently so a fresh rebuild reconstructs the live schema.

## Related decisions & notes

- [[Decisions/2026-05-23-dev-reset-out-of-migrations]] — keep `000_cleanup.sql` out of the migrations dir
- [[Decisions/2026-05-27-supabase-public-grant-default]] — explicit GRANT default for new `public.*` tables
- [[Decisions/2026-06-01-mandate-expiry-recycle]] — mandate auto-release & retake
- [[Decisions/2026-06-11-candidate-status-predicate-consolidation]] — status predicates live in `candidate-workflow.ts`
- [[Decisions/2026-06-14-candidate-stage-progression-engine]] — stage engine + slot-cap atomicity
- [[Decisions/2026-06-21-auth-hardening-and-cv-storage-lockdown]] — CV storage lockdown
- [[Decisions/2026-06-22-messaging-rls-service-role-creation]] — service-role conversation creation
- [[Decisions/2026-06-22-recruiter-mandate-job-read-rls]] — recruiter job read via mandate (migration 056)
- [[Decisions/2026-06-23-rls-recursion-jobs-policy-outage]] — the recursion outage → migration 057
- [[Decisions/2026-06-24-split-recruito-threads]] — per-party Recruito channels
- [[Decisions/2026-06-28-admin-revenue-source-of-truth]] — revenue from per-job fee columns
- [[Dev-Notes/migration-grant-snippet]] — copy-paste GRANT snippet for new tables
- [[Dev-Notes/deployment-runbook]] — applying migrations to prod
- [[Dev-Notes/supabase-auth-config-production-sync]] — auth config (dashboard-side, not in migrations)
