# Candidate status predicates live in candidate-workflow.ts

**Date:** 2026-06-11
**Status:** Accepted

## Context

A whole-codebase review found four hand-rolled candidate status sets that had
drifted from each other: `candidates-extended.ts` (duplicate/engagement check),
`recruiter.ts` (pending-candidates count), `job-fill.ts`
(`HIRED_PROTECTED_STATUSES`), and `candidate-workflow.ts`
(`TERMINAL_CANDIDATE_STATUSES`). The drift caused real bugs: the auto-reject
cascade overwrote terminal statuses (withdrawn → rejected_client), hired
candidates were not flagged as "client already engaged", and pending counts
included invoice_enabled/guarantee_tracking candidates.

## Decision

`src/lib/candidate-workflow.ts` is the single source of truth:

- `TERMINAL_CANDIDATE_STATUSES` — terminal set (existing)
- `HIRED_PIPELINE_CANDIDATE_STATUSES` — hired/invoice/guarantee pipeline (new)
- `isCandidateInProcess(status)` — not terminal AND not hired-pipeline,
  normalizes legacy statuses first (new)
- `isClientEngagementActiveStatus(status)` in `candidate-identity.ts` wraps the
  terminal set for duplicate/engagement checks (existing, now used everywhere)

New code must use these predicates instead of inlining status lists.
`guarantee_failed` and `recruiter_rejected` are NOT candidate statuses
(placement resp. application statuses) — they were dead entries in the old sets.

## Consequences

- Pinned by `job-fill.test.ts` ("never overwrites terminal or hired-pipeline
  statuses") and the existing workflow tests.
- Adding a status now means updating one file; counts, cascades and engagement
  checks follow automatically.
