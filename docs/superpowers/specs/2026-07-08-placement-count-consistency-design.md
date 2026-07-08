# Placement-count consistency across company surfaces

**Date:** 2026-07-08
**Status:** Approved by Henrik (brainstorming session)

## Problem

The company dashboard, candidates pipeline, and jobs list disagree on hiring numbers for company R92:

- Dashboard "Successful placements" = **4** (counts all `placements` rows for the company)
- Candidates pipeline "Hired" = **3** (candidates with `status = 'hired'`)
- Jobs "Filled & Closed" tab = **4** (jobs with `status = 'filled'`)

## Root cause (verified against prod data)

Anna Karlsson was hired on the Finance Manager job 2026-06-14 (placement `0865b787-b48c-4065-950f-82170ce93823` created, job `cc51170c-b368-4b3b-9e09-f8a7519dff0f` marked `filled`), then withdrawn 2026-06-28 with reason `candidate_accepted_another_offer`. The withdrawal changed only the candidate row; the placement stayed `guarantee_active` and the job stayed `filled`.

The withdraw-from-Hired block (`CANDIDATE_WITHDRAW_BLOCKED_STATUSES`) shipped the same day she was withdrawn — she slipped through just before it. `hired` is now terminal in the stage engine (`allowedNextStages("hired")` returns `[]`; reopen exists only for `rejected`), so this staleness cannot recur through any current code path. It is a one-off data artifact plus a weak dashboard definition.

## Canonical semantic

A **successful placement** = a `placements` row whose status is NOT `guarantee_failed` or `refund_processing`.

Because `hired` is terminal and placements are created only by the hire trigger (migration 018), placements ↔ hired candidates ↔ filled jobs stay in lockstep going forward.

## Changes

### 1. Code (`rekryteringsplattform/`)

- `src/lib/pricing.ts`: add
  `export const FAILED_PLACEMENT_STATUSES = ["guarantee_failed", "refund_processing"]`
  (lives next to `TIER_WINDOW_MONTHS` and `getFeePercentage(completedPlacements)`).
- Add a `.not("status", "in", ...)` filter using that constant to the four placement **count** queries:
  1. `src/lib/actions/company.ts` ~L200 — dashboard "Successful placements" card
  2. `src/lib/actions/company.ts` ~L208 — `recentPlacements` (12-month tier display)
  3. `src/lib/actions/company.ts` ~L258 — `getCompanyPlacementCountRecent`
  4. `src/lib/actions/jobs.ts` ~L117 — fee-tier count on job creation (a failed hire must not earn a volume discount)

**Explicitly untouched:** `getRecruiterEarnings`, admin revenue/analytics, company billing page, guarantee cron routes (`/api/guarantee/*`). These list placements as financial records where failed rows must remain visible. Candidates pipeline and Jobs tabs need no code change.

### 2. One-off prod data repair (run with Henrik's sign-off)

- Placement `0865b787-b48c-4065-950f-82170ce93823`: `guarantee_active` → `guarantee_failed`.
- Job `cc51170c-b368-4b3b-9e09-f8a7519dff0f` (Finance Manager): `filled` → `closed`.
- Direct SQL/service-role update; no notification triggers fire on job-status updates.
- Intended side effect: R92's 12-month tier count drops 4 → 3, which can change the fee % on future jobs.

## Verification

1. `npm run build` and `npm run lint` pass in `rekryteringsplattform/`; existing test suite (262 tests) green.
2. Post-repair evidence: re-run the read-only investigation query — the dashboard count query returns 3; Dashboard = 3, Pipeline Hired = 3, Jobs Filled tab = 3.
3. No new unit test: the change is query filters plus a constant; the check is the prod verification query.

## Future interaction

When the guarantee-workflow branch (admin Slutförd/Misslyckad) lands and marks a placement `guarantee_failed`, the dashboard now self-corrects with no extra sync. What that workflow should do to the *job* status on guarantee failure is out of scope here.
