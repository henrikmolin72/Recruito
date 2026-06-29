# Recruiter Portal & Marketplace — As-Built (2026-06-29, migrations through 061)
> Current-state companion to the original build spec [[Architecture/05-RECRUITER-PORTAL]]. The spec is the frozen April plan; this note is what the code actually does now.

## What it does today

- **Onboarding & profile.** A recruiter registers, then completes a profile form (`completeRecruiterOnboarding`) capturing industries, countries, languages, seniority focus, throughput metrics, sourcing channels, and availability. Profile photo upload is content-validated (size ≤5 MB, extension + declared MIME + magic-byte check via `verifyImageFileContent`) before landing in the shared `cvs` bucket. Completion stamps `onboarding_completed_at` and fires an internal email.
- **Marketplace (Browse Jobs).** `getAvailableJobsForRecruiter` lists jobs with status `active` or `paused` (terminal closed/filled/cancelled excluded). Each card shows: active-mandate count (slots taken), a "worked previously" tag if the recruiter ever claimed it, and a `pending_candidates_count` ("in process" across all recruiters via the shared `isCandidateInProcess` predicate). Before counting, it calls `releaseDueMandates` to reconcile expired slots so counts are correct even if the daily cron lags. Full jobs stay visible (rendered as "Fullsatt", no claim action); jobs this recruiter actively holds are hidden (they live under My Mandates).
- **Claiming a mandate.** `claimMandate` requires `approval_status === "approved"`, the job to be `active`, and room under `max_candidates` (default 8). The actual slot-cap insert goes through the **`claim_mandate` Postgres RPC** (migration 053), which row-locks the job, recounts active mandates under the lock, and inserts — closing the check-then-insert race. RPC returns `ok | already | full | notfound`, mapped to user messages. On success the company owner is notified.
- **My Mandates.** `getRecruiterMandates` returns active mandate rows with their candidates. `getRecruiterMandateById` adds job detail (fee, exclusivity, guarantee, pipeline_stages) for the per-mandate page. The mandate view groups into 3 tabs — **Active / Closed / Hired** — via `classifyMandate`: a hired candidate → Hired, a client-closed/filled/cancelled job → Closed, everything else (including paused and timer-expired-but-not-yet-released) → Active. There is deliberately no "Expired" tab; expiry is handled by release + recycle.
- **Mandate expiry & recycle.** Shared 10-day no-delivery timer (`MANDATE_EXPIRY_DAYS = 10`, `mandateExpiryDaysLeft`): a live (non-rejected, non-draft) candidate suspends the timer (returns `null`); once every candidate is rejected the clock restarts from the last rejection. The daily cron `/api/cron/mandate-expiry` (and the marketplace list) calls `releaseDueMandates`, which **decouples notify from release** — release always runs for a due mandate, the "expired" notification fires at most once (guarded by `mandate_expiry_notified_at`, migration 042). A released mandate (`is_active=false`, `released_at` set) frees its slot and the job reappears in Browse with the "worked previously" tag; retaking inserts a fresh `job_mandates` row (new `claimed_at` → fresh clock).
- **Candidate pipeline / status.** Candidate status is a PostgreSQL **ENUM type** (`candidate_status`), created in migration `001` (`'submitted','reviewing','interview',…`) and extended via `ALTER TYPE … ADD VALUE` across `013` (the workflow statuses — `under_client_review`, the `interview_stage_*`, `offer_*`, etc.), `044` (`recruito_rejected`) and `050` (`draft`). The TypeScript-side rules live in `candidate-workflow.ts` (legacy + new workflow statuses, a `TRANSITIONS` map, terminal/hired/rejected sets, and the `isCandidateInProcess` source-of-truth predicate). Stage bucketing for views uses `candidateInStage` over `MandateStage` keys (draft, in_review, submitted, interview, final_interview, offer, hired, rejected, withdrawn). `getJobProcessStats` exposes per-job aggregate counts (presented / inProcess / inInterview / rejected) to any recruiter via admin client (counts only, no PII).
- **Earnings.** `getRecruiterEarnings` sums `placements.recruiter_fee` with paid/guarantee breakdowns by placement status.
- **Referral-link applications.** `getRecruiterApplicationsForJob` reads `applications` (with `screening_answers`, `consent_given`, CV path — migration 022) and joins AI screening results from `ai_screenings`.
- **Dashboard (landing page).** `getRecruiterDashboard` (consumed by `recruiter/page.tsx`) is the aggregation entry point: it loads the recruiter row, then runs four reads in parallel — active mandates (with job + company), a candidate count, placements (summed into `revenue`), and the `status='active'` available-jobs count — returning a `stats` block (`activeMandates`, `revenue`, `candidates`, `availableJobs`) plus per-mandate candidate counts (one batched `IN` query, not an N+1 loop). Missing recruiter row → safe zeroed stats rather than an error.
- **Candidates list view.** `recruiter/candidates/page.tsx` renders `getRecruiterCandidates` (all of the recruiter's candidates with their job/company) as a filterable pipeline: tabs (All / Drafts / Submitted / In Interview / Offer / Rejected / Withdrawn / Hired) computed via shared `candidateInStage` buckets, a per-card "Seen / Not seen" indicator (`company_viewed_at`), draft resume/delete actions, and a Withdraw button gated by the same `CANDIDATE_WITHDRAW_BLOCKED_STATUSES` set the server enforces.
- **Per-job detail browsing.** `recruiter/jobs/[id]/page.tsx` is the marketplace drill-down: it fetches the job via the **admin client** (matching the listing, since RLS would 404 the row), restricted to `active`/`paused` status, computes slots-taken from active mandate rows only, renders an "Ongoing process" panel from `getJobProcessStats` (presented / in-process / in-interview / rejected across all recruiters), and shows a Take-Mandate button unless the job is full or not `active`.
- **Messages & support.** `recruiter/messages/page.tsx` shows the recruiter's conversation inbox (`getConversations`) and links to a dedicated **Contact-Recruito support thread** at `recruiter/messages/support` — a candidate-independent recruiter↔Recruito channel (`conversationType="recruito_recruiter_general"`, `getRecruiterSupportMessages`/`sendRecruiterSupportMessage`) available from day one, before any mandate or candidate exists (migration `061`).
- **Settings / data management.** `recruiter/settings/data/page.tsx` is the GDPR self-service page, rendering the shared `DataRightsActions` component (export / erasure requests) under a recruiter-scoped intro.

## Key files

- `src/lib/actions/recruiter.ts` — all recruiter server actions (profile, onboarding, marketplace, `claimMandate`, mandates, earnings, applications, plus `getRecruiterDashboard` aggregation and `getRecruiterCandidates`).
- `src/lib/actions/messages.ts` — `getConversations`, `getRecruiterSupportMessages`, `sendRecruiterSupportMessage` (the candidate-independent Recruito support thread).
- `src/lib/mandate-stages.ts` — expiry math (`mandateExpiryDaysLeft`, `MANDATE_EXPIRY_DAYS`), `isMandateLiveActive`, `countActiveRecruiters`, `candidateInStage`, `classifyMandate`, `REFERRAL_BLOCKED_JOB_STATUSES`.
- `src/lib/mandate-expiry-release.ts` — `releaseDueMandates`: shared release+notify, called by both cron and marketplace list.
- `src/lib/candidate-workflow.ts` — candidate status predicates, transition map, terminal/hired/rejected/in-process sets, withdraw reasons.
- `src/app/api/cron/mandate-expiry/route.ts` — daily cron (Bearer `CRON_SECRET`), calls `releaseDueMandates` over the whole table.
- `src/app/(dashboard)/recruiter/jobs/page.tsx` + `components/dashboard/recruiter/recruiter-jobs-list` — marketplace UI.
- `src/app/(dashboard)/recruiter/mandates/page.tsx` + `recruiter-mandates-view.tsx` — My Mandates tabs.
- `src/app/(dashboard)/recruiter/mandates/[id]/...` — per-mandate detail, candidate detail, new-candidate referral.
- `src/app/(dashboard)/recruiter/page.tsx` — dashboard landing page (consumes `getRecruiterDashboard`).
- `src/app/(dashboard)/recruiter/jobs/[id]/page.tsx` — marketplace per-job detail (admin-client job read, `getJobProcessStats` panel, Take-Mandate).
- `src/app/(dashboard)/recruiter/candidates/page.tsx` — filterable candidate-pipeline list view.
- `src/app/(dashboard)/recruiter/messages/page.tsx` + `messages/support/page.tsx` — inbox and the Contact-Recruito support thread.
- `src/app/(dashboard)/recruiter/settings/data/page.tsx` — GDPR self-service (shared `DataRightsActions`).
- `src/app/(dashboard)/recruiter/{earnings,profile,ai-policy}/page.tsx` — supporting recruiter pages.

## Data model / migrations

- **`recruiters`** — onboarding fields added by **012** (`current_country`, `experience_bracket`, agreements, `primary_industries[]`, `languages_spoken` jsonb, `seniority_focus[]`, throughput counts, `sourcing_channels[]`, `onboarding_completed_at`, etc.) with CHECK constraints on bracket/time-to-fill/hours.
- **`job_mandates`** (renamed from `recruiter_mandates` in migration 015) — columns `job_id, recruiter_id, is_active, claimed_at, released_at`, plus **`mandate_expiry_notified_at`** (**042**). **045** dropped the full `UNIQUE(job_id, recruiter_id)` constraint and replaced it with a **partial unique index `job_mandates_active_unique` (WHERE is_active)** so released past cycles don't block a retake; a duplicate active claim still raises 23505 → "Du har redan tagit detta uppdrag".
- **`claim_mandate(uuid, uuid)` RPC** — **053**, `SECURITY DEFINER`, row-locks the job and serializes concurrent claims; `GRANT EXECUTE ... TO authenticated`.
- **`jobs.recruiter_fee_percentage`** — **026** (`DECIMAL(4,2)`, default 7.00).
- **`applications`** — referral-link flow fields by **022** (`screening_answers` jsonb, `consent_given`, `reviewed_at/by`, `cv_file_path`, dup-detection indexes on email+job and linkedin+job).
- Slot capacity comes from `jobs.max_recruiters` (read by `claim_mandate`) and `jobs.max_candidates` (default 8, checked in `claimMandate`).

## Notable changes since the original plan

- **Atomic claim via RPC.** The April plan's check-then-insert claim was replaced by the `claim_mandate` RPC (053) to close a concurrency race two recruiters could exploit to exceed `max_recruiters`.
- **Mandate recycling.** Expiry no longer just blocks — it auto-releases (frees the slot) and lets the recruiter retake the job as a fresh 10-day cycle, requiring the partial-unique-index change (045) and the notify/release decoupling (042 + `releaseDueMandates`).
- **Marketplace self-heals.** The available-jobs list reconciles due mandates inline (not only via cron), so slot counts and capacity stay correct between daily runs.
- **Status model consolidated.** Candidate status logic centralized into `candidate-workflow.ts` / `mandate-stages.ts` shared predicates (see [[Decisions/2026-06-11-candidate-status-predicate-consolidation]]) — the same predicates drive recruiter counts, admin tables, and auto-reject cascades, replacing ad-hoc per-call status checks.
- **Paused jobs are referral-blocked but stay "Active".** `REFERRAL_BLOCKED_JOB_STATUSES` (= client-closed ∪ `paused`) is distinct from `CLIENT_CLOSED_JOB_STATUSES` (tab bucketing), so a paused mandate refuses new referrals yet remains in the recruiter's Active tab. See [[Architecture/As-Built/02-COMPANY-PORTAL]] for the company-side pause flow.
- **Active-recruiter count is a single shared calc** (`isMandateLiveActive` / `countActiveRecruiters`) so the company Jobs-list column and the job-detail Recruiters tab can't drift.

## Related decisions & notes

- [[Decisions/2026-06-01-mandate-expiry-recycle]] — expiry → auto-release & retake (the recycle model above).
- [[Decisions/2026-06-11-candidate-status-predicate-consolidation]] — why status predicates live in `candidate-workflow.ts`.
- [[Decisions/2026-06-22-recruiter-mandate-job-read-rls]] — recruiters keep job read access through their mandate (the "Okänt jobb" fix).
- [[Decisions/2026-06-23-rls-recursion-jobs-policy-outage]] — the jobs RLS recursion outage (migration 057) that followed the mandate-job RLS change.
- [[Decisions/2026-06-14-candidate-stage-progression-engine]] — stage-progression engine behind the pipeline transitions.
- [[Dev-Notes/deployment-runbook]] — cron / deploy context for `/api/cron/mandate-expiry`.
