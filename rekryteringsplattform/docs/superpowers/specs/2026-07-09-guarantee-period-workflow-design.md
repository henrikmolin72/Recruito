# Guarantee Period Workflow — Design

**Date:** 2026-07-09 · **Source:** client feedback, 16 annotated screenshots (`Fixes in recruito/garentee /`, images 9–14)
**Scope:** guarantee rebuild only. Other UI fixes in the folder (images 1–7, 15–17) are explicitly out of scope.

## Problem

The guarantee period today starts when a candidate is marked **hired** (DB trigger
`fn_auto_create_placement` sets `start_date = CURRENT_DATE`, `guarantee_end_date = start + months`,
status `guarantee_active`). Candidates usually serve a notice period before actually joining, so the
guarantee burns down before day one. The guarantee is also invisible on most surfaces (recruiter
mandate/browse cards, company job detail, admin job header) and there is no guarantee overview for
recruiters or companies.

## Decision (approved by Henrik 2026-07-09)

**Joining-date-gated activation.** The placement is still created at hire, but the guarantee only
starts when an admin enters the **Joining Date** (after the client confirms the candidate started).
`Guarantee Ends = joining_date + jobs.guarantee_period_months` (manual override allowed).

- Admin IA: merge `/admin/placements` into `/admin/guarantees` (one page: placements table +
  breach reports). `Placements` nav item removed; old route redirects.
- New **Guarantees** nav item + page for recruiter and for company.
- Unit stays **months** (`jobs.guarantee_period_months`, 0/1/2 ≈ client's 0/30/60 days).

## State machine (no enum changes — `payment_received` already exists unused)

- Trigger at hire: placement `confirmed`, `joining_date NULL`, `guarantee_end_date NULL`.
- `setPlacementJoiningDate(placementId, joiningDate, endOverride?)` (admin-only):
  sets `joining_date`, computes/overrides `guarantee_end_date`, mirrors to
  `candidates.guarantee_start/end_date`. If months > 0 and status ∈ {`confirmed`,
  `payment_received`} → `guarantee_active` + candidate → `guarantee_tracking` (+ stage history).
  If `invoice_sent` → dates only; payment recording flips it (existing logic, now satisfied).
  If already `guarantee_active` → dates update only.
- `recordPlacementPayment`: if job has guarantee but `joining_date` is NULL → park as
  `payment_received` (was: incorrectly `payout_released`). Otherwise unchanged.
- Everything downstream (expiry processor, T-14/T-7 reminder cron, breach reports, timer) keys off
  `guarantee_end_date`; NULL rows simply never match — no changes beyond NULL guards.

**Display status** (recruiter/company/admin tables) is derived, not raw:
Failed (`guarantee_failed`/`refund_processing`) · Completed (`payout_released` or end passed) ·
Active (`joining_date` set, end in future) · Pending start (no `joining_date` yet).

## DB — migration 067 (Henrik applies manually in Supabase SQL editor)

1. `ALTER TABLE placements ADD COLUMN IF NOT EXISTS joining_date DATE;`
2. `ALTER TABLE placements ALTER COLUMN guarantee_end_date DROP NOT NULL;`
3. Rewrite `fn_auto_create_placement()`: identical fee math, but status always `'confirmed'`,
   `guarantee_end_date NULL`, candidate guarantee mirrors left NULL.
4. Backfill: `joining_date = start_date` for existing rows (in-flight guarantees keep their
   current end dates and statuses — no retroactive change).

## Surfaces

**Admin** — merged `/admin/guarantees`: table (Job, Company, Candidate, fees, Status,
**Joining Date** [inline set-date when empty], **Guarantee Ends**, actions incl. existing
invoice/payment/Completed/Failed/Process) + breach reports below. Admin job detail header:
`Guarantee: X months` next to fee. `/admin/placements` → redirect.

**Recruiter** — new `/recruiter/guarantees`: Job, Company, Candidate, Your fee, Joining Date,
Guarantee Ends, Status + `GuaranteeTimer` progress bar on active rows (own placements only; RLS
`recruiter_id = get_recruiter_id()` already in place). Mandate detail `JobPreviewCard`: guarantee
line under payout. Browse Jobs card: guarantee line near potential earnings. Dashboard: live
remaining-guarantee progress.

**Company** — new `/company/guarantees`: Job, Candidate, Recruitment fee, Recruiter, Joining Date,
Guarantee Ends, Status + timer (RLS `company_id = get_company_id()`). Job detail header:
`Guarantee: X months` next to FEE. Dashboard: same progress. Breach reporting stays on Billing.

## Cross-cutting

- i18n: all new strings in sv/en/no/da (dictionaries have duplicate JSON keys — edit as text, never
  round-trip through a JSON serializer).
- Tests: red-first unit tests for the joining-date → end-date math and the derived display status;
  NULL-end-date guards.
- Gate: `npm run build` + `npm run lint` green; e2e on local stack across all three roles.

## Out of scope (deliberate)

Company-side "confirm joined" UI, per-day guarantee granularity, payout/refund math changes,
fee-model unification (trigger's legacy 70/30 split vs `calculateClientFee` — pre-existing,
untouched), images 1–7/15–17 fixes.
