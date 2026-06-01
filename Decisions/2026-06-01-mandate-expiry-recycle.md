# Mandate expiry → auto-release & retake (recycle)

**Date:** 2026-06-01
**Status:** Accepted

## Context

Job expiry rules (recruiter mandates):
1. Mandate taken, no candidate submitted → expires after the mandate period.
2. A submitted candidate still active → no expiry.
3. All submitted candidates rejected → countdown restarts from the last rejection.
4. Expired jobs reappear in the job list with an "Already Worked" tag.
5. A recruiter can retake an expired job only if there is candidate-submission capacity; a retake starts a new mandate cycle.

Rules 1–3 were already implemented in `mandate-stages.ts` (`mandateExpiryDaysLeft`, `MANDATE_EXPIRY_DAYS = 10`). The expiry cron was **display-only** — it notified but never released the mandate, so the slot never freed and rules 4–5 could not work.

## Decision

- **Auto-release in cron.** `/api/cron/mandate-expiry` now sets `is_active=false, released_at=now()` (plus the existing notification) when `daysLeft <= 0`. Released rows drop from the `is_active=true` scan, so the once-only semantics are preserved without relying solely on `mandate_expiry_notified_at`.
- **New row per cycle.** A retake inserts a fresh `job_mandates` row (new `claimed_at` ⇒ fresh 10-day clock). The original `UNIQUE(job_id, recruiter_id)` table constraint is replaced by a **partial unique index** `job_mandates_active_unique … WHERE is_active` (migration `045_mandate_recycle.sql`), so only one *active* mandate per recruiter/job is allowed while past cycles accumulate as history.
- **Capacity gate = job below `max_candidates`.** `claimMandate` blocks a claim/retake when the job already has `>= max_candidates` candidates (all candidates counted, mirroring the submission cap in `createCandidate`). Applied to all claims, not just retakes — it is a correct invariant and a job at cap is normally paused anyway.

## Consequences

- **Slot counts must filter `is_active`.** Released rows would otherwise over-report "full". Fixed in the three capacity reads: `getAvailableJobsForRecruiter`, `claimMandate`, and the recruiter job-detail page (`recruiter/jobs/[id]/page.tsx`). Company-side slots use the separate denormalized `current_recruiter_count` and were unaffected. Notification/analytics/admin queries already filter `is_active` or intentionally show history — left as-is.
- Rule 4 "reappears with Already Worked tag" is satisfied by the existing `worked_previously` (`everClaimedJobIds`) badge once the slot is released — no new UI. Retake = the existing **Take mandate** button on the reappeared job.
- Between the expiry instant and the next daily cron run, an expired mandate is still `is_active=true` and shows under "My Mandates / Expired" (transient, eventually swept).

## Verification

`npm run build` clean; `mandate-stages.test.ts` (7 tests) green. The data-model/cron paths have no server-action unit-test harness in the repo; verified by build + reasoning.
