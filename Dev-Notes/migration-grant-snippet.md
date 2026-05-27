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

If the table should never be touched from `supabase-js` with a user JWT, omit the `authenticated` grant. The service role bypasses GRANTs and RLS, so `createAdminClient()` in code still works.

```sql
CREATE TABLE public.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ...
);
-- No GRANT — only service-role (server actions using createAdminClient) can access.
```

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
