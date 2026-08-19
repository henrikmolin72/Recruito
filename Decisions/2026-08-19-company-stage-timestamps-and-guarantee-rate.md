# 2026-08-19 — Company stage moves stamp workflow timestamps; guarantee rate counts refund_processing

**Status:** accepted · **Branch:** `feature/interview-date-dashboard-fixes` · **Migration:** 073

## Context

The recruiter dashboard showed "Avg. time to hire 0 days" for every recruiter. Root cause: `updateCompanyStage` — the path companies use to hire — never applied `statusChangeTimestampPatch`, so `candidates.hired_at` was never written on company-driven hires. `fn_recalculate_recruiter_metrics` averaged over zero rows and `COALESCE`d to 0. Separately, the dashboard guarantee-success % excluded placements in `refund_processing`, which `guarantee.ts` and `FAILED_PLACEMENT_STATUSES` treat as failed — dashboard and Guarantees tab disagreed.

## Decisions

1. **Company-driven stage moves now apply `statusChangeTimestampPatch(mappedStatus)`** (in `updateCompanyStage`), stamping `status_changed_at` and stage timestamps (`interview_at`, `offered_at`, `hired_at`) exactly like the three recruiter-side write paths. Guarded so **replayed same-stage calls do not restamp** (differential test pins this).
2. **Accepted side effect — mandate-expiry timer:** a company rejection now refreshes `status_changed_at`, giving the mandate's 10-day expiry a fresh base instead of expiring instantly off a stale submission timestamp. This matches the documented intent in `mandate-stages.ts`; the instant-expiry-on-rejection behavior was the bug.
3. **Accepted semantics — `interview_at` = *latest* interview stage** (final_interview overwrites interview). This is the pre-existing behavior of the shared helper on recruiter-driven pipelines; company pipelines now simply match. `daysToInterview` in company analytics reads accordingly.
4. **Guarantee success rate counts `refund_processing` as a failed guarantee** — DB fn (migration 073) and the app-side fallback list in `placements.ts` both align with `FAILED_PLACEMENT_STATUSES`.
5. **Backfill (migration 073):** `hired_at` recovered from `candidate_stage_history` rows with `action = 'hire'` (predicate deliberately excludes `to_stage = 'hired'` to avoid free-text pipeline-title false positives); `AND hired_at IS NULL` keeps it idempotent and leaves recruiter-path hires untouched. All recruiter snapshots refreshed at the end. Fn hardened with `SET search_path = public, pg_temp`.

## Consequences

- Avg. time to hire becomes real data going forward and (via backfill) for historical company hires.
- Company analytics (`reviewed_at`/`interview_at`/`offered_at` consumers) start receiving values from company-driven pipelines.
- Any future logic that assumes company moves do NOT touch `status_changed_at` must revisit decision 2.

Related: [[2026-08-12-cv-prompt-injection-defense]] (previous migration 072).
