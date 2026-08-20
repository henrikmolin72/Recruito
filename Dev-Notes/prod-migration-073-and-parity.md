# Prod runbook — migration 073 + migration parity check

> **STATUS: PENDING Henrik.** Prepared 2026-08-20. Agent has no prod DB access
> (classifier guardrail) — these are the exact steps for you to run.

## 1. Apply migration 073 to prod

`073_hired_at_backfill_and_guarantee_rate.sql` is written and on `main` but **not yet in prod**.

It does three things, all **idempotent** (safe to re-run in the SQL editor):
- Backfills `candidates.hired_at` from `candidate_stage_history` where it's `NULL`
  (fixes "Avg. time to hire = 0" caused by company-driven hires never stamping `hired_at`).
- `CREATE OR REPLACE fn_recalculate_recruiter_metrics` — counts `refund_processing`
  as a **failed** guarantee, and returns `NULL` (→ UI "—") when a recruiter has no
  completed guarantees.
- Recomputes every recruiter snapshot so the changes show immediately.

**Note:** 073's `CREATE OR REPLACE` fully supersedes migration **063**'s version of the
same function. So the long-standing "was 063 ever applied to prod?" question is **moot
once 073 is applied** — 073's definition wins regardless. No need to chase 063 separately.

**How:** Supabase Dashboard → SQL Editor → paste the full contents of
`rekryteringsplattform/supabase/migrations/073_hired_at_backfill_and_guarantee_rate.sql` → Run.
No app redeploy needed.

## 2. Migration parity check (one-time, closes the audit)

Confirm local and prod migration histories match so nothing else silently lags
(like 038/039 did until 2026-07-14).

```bash
cd rekryteringsplattform
npx supabase migration list --linked
```

The linked project is `zzskjstnozqqpevkvswc` (Recruito). Compare the `REMOTE` column
against the local `supabase/migrations/` files (up to 073). Any file present locally
but missing in `REMOTE` needs applying. Known-applied per prior runbooks: 038, 039,
070, 072. Unknowns to confirm: 063 (moot after 073), 071, 073.

## 3. Diagnostic — demo recruiter guarantee rate (stale-placement suspicion)

Week-34 log flagged the demo recruiter's guarantee rate looked wrong. The rate =
`payout_released / (payout_released + guarantee_failed + refund_processing)`. A leftover
test/demo placement stuck in a terminal status skews it. List them and eyeball:

```sql
-- Replace :recruiter_email with the demo recruiter's login email.
SELECT p.id, p.status, p.created_at, c.first_name, c.last_name, j.title
FROM placements p
JOIN candidates c ON c.id = p.candidate_id
LEFT JOIN jobs j ON j.id = c.job_id
JOIN recruiters r ON r.id = p.recruiter_id
JOIN auth.users u ON u.id = r.user_id
WHERE u.email = :recruiter_email
  AND p.status IN ('payout_released', 'guarantee_failed', 'refund_processing')
ORDER BY p.created_at;
```

If a row is a stale demo/test placement, correct or remove it, then re-run
`SELECT fn_recalculate_recruiter_metrics(r.id) FROM recruiters r WHERE ...;` to refresh.
