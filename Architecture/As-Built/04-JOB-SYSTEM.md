# Job & Mandate System — As-Built (2026-06-29, migrations through 061)
> Current-state companion to the original build spec [[Architecture/06-JOB-SYSTEM]]. The spec is the frozen April plan; this note is what the code actually does now.

## What it does today

A company creates a job, Recruito admin approves it, recruiters then see it and work it via mandates. Concretely:

- **Lifecycle (actual `job_status` enum):** `draft → pending_approval → [pending_client_reconfirm] → active → paused ⇄ active → closed`. Enum also still carries the original `filled`, `cancelled` from migration 001. `pending_approval` was added in 030; `pending_client_reconfirm` in 034.
- **Create:** `createJob` writes `status='draft'` (validation skipped) or `status='pending_approval'`. A company profile is auto-created for company-role users if missing; recruiters are blocked. Fees are locked onto the row at submit time (see below). Drafts can be re-saved (upsert by `draft_id`, guarded `.eq("status","draft")`), edited (`updateJob`, draft-only), or deleted (`deleteDraftJob`, draft-only, admin-client cascade over candidates/announcements/mandates).
- **Admin approval (Step 4):** `approveJob` flips `pending_approval → active`, stamps `published_at`, then emails + notifies matching approved recruiters (`notifyMatchingRecruitersAboutJob`, matched on industry/specialization or country). Approval is **blocked** if `client_fee_amount > client_fee_amount_estimated` — admin must route through the re-confirm flow instead.
- **Fee re-confirm (034):** if admin raises the locked fee above the estimate the client agreed to, `requestClientFeeReconfirm` (admin.ts) moves the job to `pending_client_reconfirm` and records `client_fee_amount_proposed` + an uplift reason (`hard_to_fill | niche_specialist | senior_executive | urgent_timeline | custom`). Client resolves via `clientApproveProposedFee` (→ `active`, proposed becomes locked fee, publishes) or `clientRejectProposedFee` (→ back to `pending_approval`). Admin can `withdrawClientFeeReconfirm` (→ resets fee to the estimate, publishes the job to `active`, records `decision='withdrawn'`). Every transition is status-guarded against races and re-notifies admins.
- **Recruiter fee override (admin.ts):** admin can adjust a single job's recruiter payout independently of the client fee, via `updateRecruiterFeePercentage` (validates `0..100`, writes `recruiter_fee_percentage`) or `updateRecruiterFeeAmount` (validates finite `>= 0`, rounds, writes `recruiter_fee_amount`). Both `requireAdmin()` and revalidate `/admin/jobs`. Parallels the client-side `updateClientFeeAmount` override.
- **Pause / reopen (043):** `pauseJob` (`active → paused`, requires active, stores `pause_reason`), `resumeJob` (`paused → active`, clears `pause_reason` + `reopen_nudge_sent_at`). Both notify recruiters (`notifyRecruitersOfJobLifecycleChange`) and admins.
- **Auto-pause on candidate cap (032):** the cap is **not** a hard block on recruiter submission. After admin presents/screens a candidate (`candidates.ts`), once approved (`recruito_screened_at`) count `>= max_candidates` (default 8) and job is `active`, the job is auto-flipped to `paused` with `pause_reason: "Candidate Limit Reached"`.
- **Close:** `closeJob` (`active|paused → closed`, optional `close_reason`) then auto-rejects every remaining non-hired candidate (`rejectRemainingCandidates`) and notifies recruiters + admins.
- **Pipeline & announcements:** `updatePipelineStages` (refuses to drop a stage holding active candidates; defaults from `DEFAULT_PIPELINE_STAGES`); `createJobAnnouncement` / `getJobAnnouncements` (25) broadcast to active-mandate recruiters.
- **List counts:** `getCompanyJobs` derives `recruiters_count` from distinct live-active mandates via shared `countActiveRecruiters` (10-day expiry timer, read with admin client to avoid RLS under-count) and `candidates_count` from only `recruito_screened_at`-set candidates. See [[project_active_recruiter_count_parity]].

## Key files
- `rekryteringsplattform/src/lib/actions/jobs.ts` — all company/admin job server actions (create, update, close, pause, resume, pipeline, announcements, approveJob, client fee approve/reject).
- `rekryteringsplattform/src/lib/actions/admin.ts` — admin fee overrides (`updateClientFeeAmount`, `updateRecruiterFeeAmount`, `updateRecruiterFeePercentage`), `setJobMaxCandidates`, `requestClientFeeReconfirm`, `withdrawClientFeeReconfirm`.
- `rekryteringsplattform/src/lib/actions/candidates.ts` — candidate presentation path that enforces the `max_candidates` auto-pause.
- `rekryteringsplattform/src/lib/pricing.ts` + `src/lib/utils.ts` — `getFeePercentage` (volume tier), `calculateClientFee` / `calculateRecruiterFee` (fees locked at create).
- `rekryteringsplattform/src/lib/job-fill.ts` — `rejectRemainingCandidates`, `notifyRecruitersOfJobLifecycleChange` (server-only, not exposed as RPC).
- `rekryteringsplattform/src/lib/mandate-stages.ts` — `countActiveRecruiters`, expiry timer used by list/detail count parity.
- Routes: `src/app/(dashboard)/company/jobs/{page,new,[id],[id]/edit}` , `src/app/(dashboard)/admin/jobs/page.tsx`.
- Form: `src/app/(dashboard)/company/jobs/new/create-job-form.tsx`, options in `src/lib/job-form-options.ts`.

## Data model / migrations
`jobs` table (`status job_status`, base from `001_initial_schema.sql`). Shaping migrations for this area:
- **017** `expand_job_fields` — the bulk of the job columns (employment, structured location, salary extended, benefits[], screening_questions jsonb, requirements, working conditions, timeline). Notable CHECKs: `guarantee_period_months 0..2`, `recruiter_fee_manual >= 2000`, `open_positions 1..100`.
- **024** `allow_nullable_industry` — `industry` made nullable (default `''`) so drafts can skip step 1.
- **025** `job_announcements` — `job_announcements` table + RLS (company own-job insert/select, recruiter select via active mandate).
- **030** `process_flow_gates` — adds `pending_approval` enum value (before `active`); also `candidates.recruito_screened_at/_by`.
- **032** `jobs_max_candidates_cap` — `max_candidates INTEGER NOT NULL DEFAULT 8 CHECK (>0)`.
- **033** `locked_job_fees` — `is_exclusive`, `client_fee_amount`, `recruiter_fee_amount` (calculator becomes estimate; row is source of truth once set; backfilled).
- **034** `client_fee_reconfirm` — adds `pending_client_reconfirm` enum value (after `pending_approval`) + `client_fee_amount_estimated`, `client_fee_amount_proposed`, `client_fee_uplift_reason/_note`, `client_fee_reconfirm_requested_at/_resolved_at/_decision`.
- **043** `job_pause_workflow` — `pause_reason`, `close_reason` (schema-drift catch-up: `closeJob` already wrote it), `reopen_nudge_sent_at`.
- Mandates live in `job_mandates` (referenced by RLS in 015/021/042/045/046/057/058; `claim_mandate` fn in 053). Mandate internals are their own area — see [[project_active_recruiter_count_parity]], [[project_paused_job_referral_gate]].

## Notable changes since the original plan
- **Status machine diverged from the spec.** The April spec ([[Architecture/06-JOB-SYSTEM]] §6.1) defines transitions over `draft/active/paused/filled/closed/cancelled` only. The shipped flow inserts two admin/fee gates — `pending_approval` (030) and `pending_client_reconfirm` (034) — that the spec never modeled. `filled`/`cancelled` remain in the enum but the live flow uses `closed` (via `closeJob`) and auto-`paused`, not `filled`.
- **Fees are row-locked, not computed on read.** Spec treated the fee calculator as live; 033 made `jobs.client_fee_amount` / `recruiter_fee_amount` the source of truth, locked at submit. `client_fee_amount_estimated` (034) is written once at submit and never mutated — it's the consent baseline the whole re-confirm flow compares against.
- **Per-job candidate cap + auto-pause** (032/043) is new vs. the spec; enforced at presentation time, not at recruiter submission, and surfaces as a `paused` job with reason `"Candidate Limit Reached"`.
- **`close_reason` was schema drift** — written by `closeJob` before the column existed; 043 reconciled it.
- **RLS for `jobs` is now recursion-safe.** A raw cross-table subquery added in 056 caused a company+recruiter login outage; 057/058 moved mandate checks into `SECURITY DEFINER` helpers. Any new policy touching `jobs`/`job_mandates`/`candidates` must follow that pattern.

## Related decisions & notes
- [[Decisions/2026-06-23-rls-recursion-jobs-policy-outage]] — the 056→057 jobs-RLS recursion outage and the SECURITY-DEFINER guardrail.
- [[Decisions/2026-06-22-recruiter-mandate-job-read-rls]] — recruiter read access to mandated jobs (the 056 change this area depends on).
- [[Decisions/2026-06-01-mandate-expiry-recycle]] — mandate expiry/recycle, feeds the active-recruiter count.
- [[Decisions/2026-06-28-admin-revenue-source-of-truth]] — revenue = Σ `client_fee_amount − recruiter_fee_amount`, i.e. the locked job fees this area writes.
- [[Architecture/06-JOB-SYSTEM]] — frozen April build spec (the §6.1 transition table this note diverges from).
