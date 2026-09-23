# Migration snippet: GRANT for new public tables

Use this snippet in every new migration that creates a table in the `public` schema. See [Decisions/2026-05-27-supabase-public-grant-default.md](../Decisions/2026-05-27-supabase-public-grant-default.md) for the why.

## Standard snippet

```sql
CREATE TABLE public.my_new_table (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now()
    -- ...your columns...
);

-- Required for the app (supabase-js) to reach this table after Oct 30, 2026.
-- Harmless to include before that date. RLS still applies on top.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_new_table TO authenticated;

-- Only if the table must be readable/writable by unauthenticated users:
-- GRANT SELECT ON public.my_new_table TO anon;
```

## Service-role-only tables (admin/audit/internal)

If the table should never be touched from `supabase-js` with a user JWT, grant **only** `service_role`. The service role bypasses RLS but **not** GRANTs — without this, `createAdminClient()` gets `permission denied` (learned in migration 080).

```sql
CREATE TABLE public.audit_log (
    id bigserial PRIMARY KEY,
    -- ...
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq TO service_role; -- only for serial/identity ids
```

## Functions and sequences too

Since migration 081, default privileges are off for tables, sequences **and** functions. A new RPC needs `GRANT EXECUTE ON FUNCTION public.fn(args) TO authenticated;` (or `service_role`), and a serial id needs the sequence grant for whichever role inserts.

## Migrations 000 / 081

`000_legacy_default_privileges.sql` restores the old auto-grants **only** so 001–080 replay to prod-identical grants on `supabase db reset` / branches; `081` switches them off again. Don't add migrations that rely on defaults.

## Common mistakes to avoid

- ❌ Forgetting the grant and then debugging a `permission denied` error in the app
- ❌ Granting to `anon` when you only need `authenticated`
- ❌ Assuming RLS replaces the GRANT — it doesn't; GRANT is the gate, RLS is the policy
- ❌ Using `GRANT ALL` — overgrants; stick to the four DML verbs you actually need

## Verifying

After applying a migration that creates a public table:

```sql
-- In Supabase SQL editor:
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'my_new_table';
```

Should show `authenticated` with `SELECT/INSERT/UPDATE/DELETE` (or whatever subset you intended).
