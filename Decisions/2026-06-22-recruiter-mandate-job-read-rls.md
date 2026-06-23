# 2026-06-22 — Recruiters retain job read access via mandate (RLS)

## Context
Reported bug: a job's name "changed" after it was closed/filled following a hire
(e.g. "DevOps Engineer" → a different label on the recruiter side). Corporate and
admin views were unaffected.

## Investigation
The job `title` is **never** mutated by any workflow. Verified across the full
hire→close path (`closeJobAfterHire` → `markJobFilledAndReject` in
`src/lib/job-fill.ts`) and every job-status action in `src/lib/actions/jobs.ts` —
they write `status` only. Title is set solely on create/edit from the form.

Root cause was **read access**, not data. The `jobs` SELECT RLS policy
("Active jobs visible to all auth users", migration 021) was:

```sql
status = 'active' OR company_id = get_company_id() OR is_admin()
```

A recruiter matches only the `status = 'active'` branch. Once a job becomes
`filled`/`closed`/`paused`, the recruiter loses SELECT on the row, the
`job:jobs(title)` join returns null, and the recruiter UI falls back to
"Okänt jobb" (`recruiter.ts` lines 350, 625, 764). Corporate (`company_id`) and
admin (`is_admin()`) branches keep working — which is why only recruiters regressed.

## Decision
Add a mandate-based branch so a recruiter who holds (or held) a mandate on a job
keeps SELECT access for the job's whole lifecycle:

```sql
OR EXISTS (
  SELECT 1 FROM public.job_mandates jm
  WHERE jm.job_id = jobs.id AND jm.recruiter_id = get_recruiter_id()
)
```

Implemented in `supabase/migrations/056_recruiter_mandate_job_read.sql`.

## Rationale / security
- No new data exposure: it grants continued read of the *same* job row the
  recruiter was already authorized to see while the job was active.
- Strictly scoped to the recruiter's own mandates via `get_recruiter_id()`; no
  cross-tenant leakage.
- No `is_active` filter on the mandate, so historical placements/earnings keep a
  stable job title too.
- Indexed (`idx_mandates_job`, `idx_mandates_recruiter`); `get_recruiter_id()` is
  STABLE.
- No app code change — the existing "Okänt jobb" fallback remains as a harmless
  defensive default.

## Status
**Applied 2026-06-22** — user ran migration 056 successfully against Recruito prod
(`zzskjstnozqqpevkvswc`). Remaining: behavioral confirmation that a recruiter with
a mandate sees the real title on a filled/closed job (no more "Okänt jobb").

(Note: the in-session Supabase MCP is a different account — projects
`pmyqnqqfcvustkhufxny`, `pfbtczggptsfshmeloex` — so it could not apply or query the
prod DB directly; the user applied it.)
