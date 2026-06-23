# 2026-06-23 — Jobs RLS recursion outage (company + recruiter login) → migration 057

## Symptom
Company and recruiter users could authenticate but then hit a "browsing error"
(dashboard 500). Admin login + dashboard worked normally. Started ~2026-06-23.

## Root cause
Migration **056** (`056_recruiter_mandate_job_read.sql`, applied to prod
2026-06-22) added a **raw subquery** to the `jobs` SELECT policy:

```sql
OR EXISTS (SELECT 1 FROM public.job_mandates jm
           WHERE jm.job_id = jobs.id AND jm.recruiter_id = get_recruiter_id())
```

That subquery reads `job_mandates`, so it is evaluated under `job_mandates`' RLS.
But the `job_mandates` **and** `candidates` SELECT policies (migration 021) each
contain `… job_id IN (SELECT id FROM public.jobs WHERE company_id = get_company_id())`,
which reads `jobs`. Net result: mutual recursion

```
jobs → job_mandates → jobs → …
candidates → jobs → job_mandates → jobs → …
```

Postgres aborts with `42P17: infinite recursion detected in policy for relation "jobs"`
on every RLS-scoped read of `jobs` / `job_mandates` / `candidates`.

The company dashboard (`getCompanyDashboard`, reads jobs + candidates) and the
recruiter dashboard (`getRecruiterDashboard`, reads job_mandates⋈jobs) both call
`handleError()` on a query error, which **throws** → server component 500 →
"browsing error". Admin reads via the **service-role** client (`createAdminClient()`),
which bypasses RLS, so admin was unaffected.

## Why the helpers were safe but 056 wasn't
`get_company_id()`, `get_recruiter_id()`, `is_admin()` are `SECURITY DEFINER` — they
run as the owner and bypass RLS on their internal reads, so they never recurse.
056's `EXISTS(…)` was a plain inline subquery, so it stayed subject to RLS.

## Fix — migration 057
`057_fix_jobs_rls_recursion.sql`: move the mandate check into a `SECURITY DEFINER`
helper `recruiter_holds_job_mandate(uuid)` and call it from the jobs policy. Breaks
the cycle; identical access semantics; idempotent; safe regardless of 056 state.

## Verification
Reproduced on stock Postgres 17 (Docker), mirroring 021 + 056 policies:
- before 057: all four reads → `42P17 infinite recursion`.
- after 057: recruiter sees their mandated (closed) job, company sees its own job +
  candidates, and an **unrelated recruiter sees 0 jobs** (no data leak).

## Lesson / guardrail
Never put a raw cross-table subquery in an RLS policy when the referenced table's
policy can reference back to the first table. Wrap cross-table checks in a
`SECURITY DEFINER` function (the established Recruito pattern).
