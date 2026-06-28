# 2026-06-28 — Admin dashboard revenue uses job negotiated fees, not placement fee snapshots

## Context
The admin dashboard (`getAdminStats` in `rekryteringsplattform/src/lib/actions/admin.ts`) showed
revenue **7 650 €** and Total Candidates **34/38** (counting drafts). Both were flagged wrong by the
product owner. Required: revenue = Σ over placements of (client fee − recruiter fee); Total Candidates =
presented candidates only (exclude drafts).

## Problem found
`placements` carries its own fee snapshot (`total_fee`, `platform_fee`, `recruiter_fee`) seeded with a
generic **15%-of-salary** model. For the live rows these are **out of sync** with the job's
admin-negotiated fees:

| Job | placement total_fee / recruiter_fee | job client_fee_amount / recruiter_fee_amount |
|-----|--------------------------------------|----------------------------------------------|
| DevOps Engineer | 14250 / 9975 | 11880 / 7700 |
| Finance Manager | 11250 / 7875 | 9750 / 5200 |

Summing the placement `platform_fee` gives 7650. The fields literally named "client fee" / "recruiter
fee" in the app are the **job** columns `client_fee_amount` / `recruiter_fee_amount` (set via the admin
fee-config actions). Σ(client_fee_amount − recruiter_fee_amount) = **8730**. Since the placement-snapshot
interpretation yields exactly the rejected 7650, the only reading consistent with the owner marking 7650
wrong is the job-fee one.

## Decision
- **Revenue source of truth = the job's negotiated `client_fee_amount` / `recruiter_fee_amount`**, read
  per placement via an embedded select `placements.select("status, jobs(client_fee_amount, recruiter_fee_amount)")`.
  Contribution clamped at `Math.max(client − recruiter, 0)` so a mis-negotiated job can't subtract.
  Placement `total_fee`/`platform_fee`/`recruiter_fee` are **not** used for the dashboard revenue figure.
- **Total Candidates excludes drafts** via `.neq("status", "draft")` — equivalent to the existing
  `isCandidateSubmitted` predicate (only `"draft"` normalizes to draft; column is `NOT NULL`).
- A silent `.limit(1000)` cap / query error on the placements set would understate a money figure, so both
  conditions now log (no behavioural change at current scale; move to a SQL sum if the cap ever fires).

## Verification
Live DB (service-role): candidates 38→37, revenue 7650→8730. `npm run build`, `npm run lint` (0 errors),
`tsc --noEmit` clean, regression test `src/lib/actions/admin-stats.test.ts` (2 tests, green). Code review
and security review both APPROVE (no Critical/High/Medium).

## Follow-ups (out of scope, flagged)
- Type/DB drift: `CandidateStatus` union in `src/types/db-types.ts` omits `'draft'` though the DB enum has it.
- If placements ever exceed 1000, replace the row-fetch revenue sum with a DB-side aggregate.
