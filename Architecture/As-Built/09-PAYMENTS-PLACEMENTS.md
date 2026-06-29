# Payments & Placements — As-Built (2026-06-29, migrations through 061)
> Current-state companion to the original build spec [[Architecture/09-PAYMENTS]]. The spec is the frozen April plan; this note is what the code actually does now.

## What it does today

- **No Stripe.** Despite `placements.stripe_payment_intent_id` / `stripe_invoice_id` / `stripe_payout_id` columns (migration 001) and the `sendPlacementInvoice` doc comment ("In a production system this would call Stripe API"), there is no Stripe SDK, lib, or call anywhere in `src/` (grep for `stripe` over `src/**/*.ts(x)` returns 0 hits). Invoicing and payouts are **manual state transitions an admin records**; the Stripe columns are never written.
- **Placements are auto-created in the DB, not by app code.** A `BEFORE UPDATE` trigger on `candidates` (`fn_auto_create_placement`, migration 018) fires when a candidate transitions to `hired`. It snapshots the fee from the job and inserts the `placements` row — guard: skips if a placement already exists for the candidate.
- **Fee split is computed in the trigger, not in TS:** `total_fee = ROUND(annual_salary * fee_percentage/100)` (fee_pct defaults to 15), `platform_fee = ROUND(total_fee * 0.30)`, `recruiter_fee = total_fee − platform_fee` (i.e. platform 30% / recruiter 70%). Salary source is `candidates.expected_salary` → `jobs.salary_max` → `salary_min` → 0.
- **Placement status state machine** (enum `placement_status`, migration 001), driven by `placements.ts` + guarantee routes:
  - `confirmed` (no guarantee) **or** `guarantee_active` (guarantee_months > 0) — set at trigger insert.
  - `sendPlacementInvoice` → `invoice_sent` (only from `confirmed`/`guarantee_active`; blocks if `invoice_sent_at` already set).
  - `recordPlacementPayment` (only from `invoice_sent`) → `guarantee_active` if `guarantee_end_date` is still in the future, else straight to `payout_released` (+ `payout_released_at`, `completed_at`).
  - `guarantee_active` → `payout_released` when the guarantee window passes (`processGuaranteeExpirations` admin action **or** the cron reminders route).
  - `guarantee_active` → `guarantee_failed` via `reportGuaranteeFailure` (admin action; refunds full `total_fee`).
  - Company-reported breach path lands in `refund_processing` (see below).
  - Note: the enum value `payment_received` exists but is **never used** — code skips it.
- **Two guarantee-failure paths, different refund math:**
  1. **Admin-initiated** `reportGuaranteeFailure` (in `placements.ts`) → `guarantee_failed`, `refund_amount = total_fee` (full refund).
  2. **Company-initiated breach** `POST /api/guarantee/breach` → inserts a `guarantee_breach_reports` row with a **proportional** refund (`computeProportionalRefund` over `start_date → guarantee_end_date`, fraction clamped [0,1]); admin then approves/rejects via `POST /api/guarantee/breach/review`. Approve → placement `refund_processing` + `guarantee_failed_at`. The breach path accepts placements in `guarantee_active` **or** `payout_released`.
- **Guarantee reminders + auto-complete cron:** `GET /api/guarantee/reminders` (CRON_SECRET-gated, header-only auth) sends T-14 / T-7 company reminders and auto-transitions expired `guarantee_active` placements to `payout_released`. Idempotency via the `guarantee_reminders_sent` table (`UNIQUE(placement_id, reminder_type)`).
- **Every admin mutation writes an `audit_log` row** (best-effort: a failed audit insert is logged, never blocks the placement mutation). Recruiter metrics are recalculated via the `fn_recalculate_recruiter_metrics` RPC after terminal transitions.
- **Admin dashboard revenue does NOT use placement fee snapshots.** `getAdminStats` sums `Math.max(job.client_fee_amount − job.recruiter_fee_amount, 0)` over placements (embedded `jobs(...)` select). The placement `total_fee`/`platform_fee`/`recruiter_fee` are treated as stale 15%-seed snapshots and deliberately excluded. See [[Decisions/2026-06-28-admin-revenue-source-of-truth]].
- **Client fee re-confirmation workflow (consent gate when admin raises a fee).** When the admin Approve modal finds the final `client_fee_amount` is higher than the client-declared `client_fee_amount_estimated`, the job enters a consent loop on the new `pending_client_reconfirm` status (migration 034). Four server actions drive it, all status-guarded with `.eq("status", ...)` on the update to lose races safely:
  1. **`requestClientFeeReconfirm(jobId, reason, note?)`** (`admin.ts`, `requireAdmin()`) — admin asks the client to reconfirm the higher fee. Validates `reason` (one of `hard_to_fill`/`niche_specialist`/`senior_executive`/`urgent_timeline`/`custom`; `custom` requires a note) and that the final fee actually exceeds the estimate. Transitions `pending_approval` (or re-issues from `pending_client_reconfirm`) → `pending_client_reconfirm`, writes `client_fee_amount_proposed` (= the final fee), `client_fee_uplift_reason`/`_note`, `client_fee_reconfirm_requested_at`, and clears prior resolve/decision. Best-effort dispatch of an in-app notification + `feeReconfirmEmail` to the company (failure logged, never blocks).
  2. **`clientApproveProposedFee(jobId)`** (`jobs.ts`, company-scoped via `verifyJobOwnership`) — client accepts. `pending_client_reconfirm` → `active`, sets `client_fee_amount = client_fee_amount_proposed`, clears the proposal, `decision = "approved"`, publishes (`published_at` if unset), then notifies matching recruiters (job is now eligible) + admins.
  3. **`clientRejectProposedFee(jobId)`** (`jobs.ts`, company-scoped) — client declines. → back to `pending_approval`, clears proposal + uplift reason/note, `decision = "rejected"`; notifies admins so they can revise or withdraw.
  4. **`withdrawClientFeeReconfirm(jobId)`** (`admin.ts`, `requireAdmin()`) — admin one-click revert. → `active`, restores `client_fee_amount = client_fee_amount_estimated` (the baseline), clears the proposal/uplift, `decision = "withdrawn"`, publishes.
  Decision strings (`approved`/`rejected`/`withdrawn`) are stored on `client_fee_reconfirm_decision`; the migration comment notes full history lives in notifications.

## Key files

- `rekryteringsplattform/src/lib/actions/placements.ts` — load-bearing hot path. All admin placement transitions: `sendPlacementInvoice`, `recordPlacementPayment`, `processGuaranteeExpirations`, `reportGuaranteeFailure`, recruiter-metrics RPCs, `getAdminPlacements`. All gated by `requireAdmin()` (except `getRecruiterPerformanceMetrics`, recruiter-scoped via `auth.getUser()`).
- `rekryteringsplattform/src/lib/guarantee.ts` — `computeProportionalRefund(totalFee, startDate, endDate, now)`; fraction clamped [0,1], 60-day fallback window when `start_date` missing.
- `rekryteringsplattform/src/lib/guarantee.test.ts` — unit tests for the refund math.
- `rekryteringsplattform/src/app/api/guarantee/breach/route.ts` — company files a breach; ownership-checked, proportional refund, notifies admins.
- `rekryteringsplattform/src/app/api/guarantee/breach/review/route.ts` — admin approve/reject; idempotent on `admin_status !== 'pending'`.
- `rekryteringsplattform/src/app/api/guarantee/reminders/route.ts` — CRON_SECRET cron: T-14/T-7 reminders + auto-complete expired guarantees.
- `rekryteringsplattform/src/lib/actions/admin.ts` — `getAdminStats` revenue/candidate counts (the source-of-truth logic); admin side of the fee re-confirmation flow: `requestClientFeeReconfirm`, `withdrawClientFeeReconfirm`.
- `rekryteringsplattform/src/lib/actions/jobs.ts` — company side of the fee re-confirmation flow: `clientApproveProposedFee`, `clientRejectProposedFee` (both gated by `verifyJobOwnership`).
- `rekryteringsplattform/src/lib/actions/admin-stats.test.ts` — regression tests pinning the revenue/draft-exclusion behaviour.

## Data model / migrations

- **`placements`** (001) — financials (`annual_salary`, `fee_percentage`, `total_fee`, `platform_fee`, `recruiter_fee`), `status placement_status`, `start_date`, `guarantee_end_date`, unused `stripe_*` columns, `UNIQUE(candidate_id)`.
- **enum `placement_status`** (001): `confirmed`, `invoice_sent`, `payment_received` (unused), `guarantee_active`, `payout_released`, `guarantee_failed`, `refund_processing`.
- **Migration 018** (`018_placement_automation_metrics.sql`) — adds `placements.refund_amount/guarantee_failed_at/guarantee_failed_reason/completed_at/notes`; `candidates.placement_id/guarantee_start_date/guarantee_end_date`; `recruiters.perf_*` metric columns; the `fn_auto_create_placement` trigger (the 30/70 split lives here), plus `fn_process_guarantee_expirations`, `fn_handle_guarantee_failure`, `fn_recalculate_recruiter_metrics`. Note: the TS `processGuaranteeExpirations` re-implements the expiry loop in app code rather than calling `fn_process_guarantee_expirations`.
- **Migration 029** (`029_guarantee_automation.sql`) — `guarantee_breach_reports` (one per placement via `UNIQUE(placement_id)`, `admin_status` pending/approved/rejected, proportional `refund_amount`) and `guarantee_reminders_sent` (`UNIQUE(placement_id, reminder_type)`). RLS: companies see their own breach reports, admins see all.
- **Migration 034** (`034_client_fee_reconfirm.sql`) — the client fee re-confirmation state. Adds enum value `pending_client_reconfirm` to `job_status` (after `pending_approval`) and `jobs` columns: `client_fee_amount_estimated` (fee the client signed the declaration for; set once, never mutated), `client_fee_amount_proposed` (admin's higher amount; set on entering reconfirm, cleared on resolve), `client_fee_uplift_reason`/`client_fee_uplift_note`, `client_fee_reconfirm_requested_at`/`_resolved_at`, and `client_fee_reconfirm_decision` (approved/rejected/withdrawn). Backfills `client_fee_amount_estimated` from `client_fee_amount` for existing `pending_approval` jobs.

## Notable changes since the original plan

- **Stripe was specced but never built.** The plan's Stripe payment-intent/invoice/payout lifecycle exists only as dormant columns; the live flow is admin-recorded manual transitions.
- **Guarantee handling moved into app code + a cron route** (migration 029, mid-2026) on top of the original DB-function design. The TS reminder cron and `processGuaranteeExpirations` both transition expired guarantees — overlapping responsibility with the SQL `fn_process_guarantee_expirations`, which is now effectively unused.
- **Proportional refunds** (`computeProportionalRefund`) were added for the company breach path; the older admin `reportGuaranteeFailure` path still refunds the **full** `total_fee`. The two paths are intentionally different.
- **Revenue source-of-truth flipped off placement snapshots onto job negotiated fees** on 2026-06-28: the placement `total_fee`/`platform_fee`/`recruiter_fee` (15%-of-salary seed) drifted out of sync with admin-negotiated `jobs.client_fee_amount`/`recruiter_fee_amount`; the dashboard now reads the job columns. See [[Decisions/2026-06-28-admin-revenue-source-of-truth]].
- **Cron auth hardened to header-only** (Bearer or legacy `x-cron-secret`) to keep the secret out of access logs.

## Related decisions & notes

- [[Decisions/2026-06-28-admin-revenue-source-of-truth]] — why dashboard revenue = Σ(job client_fee − recruiter_fee), not placement snapshots.
- [[Architecture/09-PAYMENTS]] — frozen April build spec this note supersedes.
- Cross-area: candidate `hired` transition is what triggers placement creation — see [[Architecture/As-Built/05-CANDIDATES-WORKFLOW]]. Negotiated `client_fee_amount`/`recruiter_fee_amount` are set in the admin fee-config flow — see [[Architecture/As-Built/04-JOB-SYSTEM]].

> ponytail note: no Dev-Notes runbook covers this area (checked `Dev-Notes/` — only deployment/auth/migration-grant/e2e docs exist); none linked because none apply.
