-- Email suppression list — recipients we must stop emailing.
--
-- Populated exclusively by the Resend delivery webhook (POST /api/webhooks/resend)
-- on hard bounces (bounce.type = 'Permanent') and spam complaints. The send path
-- (dispatch() in src/lib/email/internal-notifications.ts) checks this list before
-- every send and skips suppressed addresses, protecting domain reputation and
-- avoiding repeat sends to dead or complaining inboxes.
--
-- Service-role only: written and read via createAdminClient (bypasses RLS). There
-- is intentionally NO policy and NO grant for `authenticated`/`anon` — there is no
-- end-user UI for this table. RLS is left enabled with zero policies so the table
-- is denied by default to anyone but the service role. If an admin dashboard later
-- needs to read it, add a SELECT policy + `GRANT SELECT ... TO authenticated` then
-- (see CLAUDE.md §6 grant rule).

CREATE TABLE IF NOT EXISTS public.email_suppressions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text NOT NULL,
    reason        text NOT NULL CHECK (reason IN ('hard_bounce', 'complaint')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    last_event_at timestamptz NOT NULL DEFAULT now(),
    -- One row per (recipient, reason). The webhook upserts on this key so
    -- duplicate event deliveries are idempotent. This unique index also serves
    -- the pre-send point lookup `WHERE email = $1` (email is the leading column),
    -- so no separate index on email is needed.
    UNIQUE (email, reason)
);

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
