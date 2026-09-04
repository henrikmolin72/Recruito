-- 080: presence tracking for the admin "Recruiters online | Companies online"
-- header counter and its /admin/presence history page (client ask 2026-09-04).
--
-- One row per user "session": the dashboard heartbeat (every 60 s while the tab
-- is visible) extends the latest row's last_seen_at, or starts a new row after
-- a 15-minute gap. "Online" = last_seen_at within the last 5 minutes. Only
-- recruiter/company users are recorded; admins are never counted.
--
-- Service-role-only: read/written exclusively via createAdminClient(). We grant
-- the service_role DML explicitly (NOT authenticated/anon) so the table stays
-- unreachable with a user JWT while the server actions always work. This is
-- deliberate: service_role bypasses RLS but NOT table GRANTs (rolbypassrls=t,
-- rolsuper=f), and a fresh DB whose default privileges don't cover service_role
-- otherwise fails every read/write with "permission denied for table" (verified
-- on the local stack 2026-09-04). Deleting a profile cascades its sessions.
CREATE TABLE IF NOT EXISTS public.presence_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presence_sessions_last_seen
  ON public.presence_sessions (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_presence_sessions_user_last_seen
  ON public.presence_sessions (user_id, last_seen_at DESC);

ALTER TABLE public.presence_sessions ENABLE ROW LEVEL SECURITY;

-- Server-side access only. No authenticated/anon grant → RLS-on + no-policy keeps
-- the table invisible to user JWTs; the service_role grant keeps createAdminClient working.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presence_sessions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.presence_sessions_id_seq TO service_role;
