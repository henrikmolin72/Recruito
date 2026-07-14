# Prod repair 2026-07-14 — apply missing migrations 038 + 039

> **STATUS: APPLIED to prod 2026-07-14 by Henrik (SQL editor), reported success.** Migration 070 (`jobs.location DROP NOT NULL`) was applied the same day. Kept as runbook reference.

**Evidence (Vercel prod runtime errors):**
- `PGRST202 Could not find the function public.consume_rate_limit(p_key, p_limit, p_window_ms)` — 89 hits since 2026-05-29 on `/api/candidates/check-duplicate`, `/login`, `/api/generate-shortlist`, `/api/screening-report`. Rate limiting silently degrades to per-isolate in-memory (ineffective on Vercel).
- `PGRST205 Could not find the table 'public.audit_log'` — 4 hits since 2026-07-10 on `/admin/guarantees`. Audit writes (joining-date set, invoice/payment status, anonymization) are silently lost.

**Root cause:** migrations `038_rate_limits.sql` and `039_data_rights.sql` exist locally but were never applied to the prod Supabase project.

**Fix:** run the SQL below in the **prod Supabase SQL editor** (Dashboard → SQL Editor). It is idempotent — safe to re-run. No app deploy needed.

**Grants note (CLAUDE.md §6):** `rate_limits` and `audit_log` are service-role-only (RLS on, no policies) → no `authenticated` grant. `data_rights_requests` has a user-facing SELECT policy → gets `GRANT SELECT` to `authenticated` (writes stay service-role).

```sql
-- ============================================================
-- 038: rate_limits + consume_rate_limit()
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON rate_limits (reset_at);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: service-role-only.

CREATE OR REPLACE FUNCTION consume_rate_limit(
    p_key TEXT,
    p_limit INTEGER,
    p_window_ms INTEGER
)
RETURNS TABLE (
    allowed BOOLEAN,
    remaining INTEGER,
    retry_after_seconds INTEGER,
    reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_window INTERVAL := (p_window_ms || ' milliseconds')::interval;
    v_row rate_limits%ROWTYPE;
BEGIN
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_now + v_window)
    ON CONFLICT (key) DO UPDATE
        SET count = CASE
                WHEN rate_limits.reset_at <= v_now THEN 1
                ELSE rate_limits.count + 1
            END,
            reset_at = CASE
                WHEN rate_limits.reset_at <= v_now THEN v_now + v_window
                ELSE rate_limits.reset_at
            END
    RETURNING * INTO v_row;

    IF v_row.count > p_limit THEN
        RETURN QUERY SELECT
            FALSE,
            0,
            GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.reset_at - v_now)))::INTEGER),
            v_row.reset_at;
    ELSE
        RETURN QUERY SELECT
            TRUE,
            GREATEST(0, p_limit - v_row.count),
            GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.reset_at - v_now)))::INTEGER),
            v_row.reset_at;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- ============================================================
-- 039: audit_log + data_rights_requests + anonymize_candidate()
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    performed_by UUID REFERENCES profiles(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS audit_log_target_idx ON audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS audit_log_performed_by_idx ON audit_log (performed_by);
CREATE INDEX IF NOT EXISTS audit_log_performed_at_idx ON audit_log (performed_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- No policies: service-role-only. Admin-UI reads via createAdminClient().

DO $$ BEGIN
    CREATE TYPE data_rights_request_type AS ENUM ('erasure', 'export');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE data_rights_request_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS data_rights_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_type data_rights_request_type NOT NULL,
    status data_rights_request_status NOT NULL DEFAULT 'pending',
    subject_user_id UUID REFERENCES profiles(id),
    subject_candidate_id UUID REFERENCES candidates(id),
    requested_by UUID REFERENCES profiles(id),
    requested_email TEXT,
    reason TEXT,
    processed_by UUID REFERENCES profiles(id),
    processed_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (subject_user_id IS NOT NULL OR subject_candidate_id IS NOT NULL OR requested_email IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS data_rights_requests_status_idx ON data_rights_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS data_rights_requests_subject_user_idx ON data_rights_requests (subject_user_id);
CREATE INDEX IF NOT EXISTS data_rights_requests_subject_candidate_idx ON data_rights_requests (subject_candidate_id);

ALTER TABLE data_rights_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY data_rights_requests_select_own ON data_rights_requests
        FOR SELECT
        USING (auth.uid() = requested_by OR auth.uid() = subject_user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- App-facing reads (RLS-scoped); avoids the Oct 30 2026 Data-API grant cliff.
GRANT SELECT ON data_rights_requests TO authenticated;

CREATE OR REPLACE FUNCTION anonymize_candidate(
    p_candidate_id UUID,
    p_admin_id UUID,
    p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM candidates WHERE id = p_candidate_id) INTO v_exists;
    IF NOT v_exists THEN
        RETURN FALSE;
    END IF;

    UPDATE candidates
       SET first_name = '[Raderad]',
           last_name = '',
           email = NULL,
           phone = NULL,
           linkedin_url = NULL,
           current_title = NULL,
           current_company = NULL,
           expected_salary = NULL,
           cv_file_path = NULL,
           cover_note = NULL,
           qualification_summary = NULL,
           rejection_reason = NULL,
           updated_at = NOW()
     WHERE id = p_candidate_id;

    DELETE FROM messages
     WHERE conversation_id IN (
        SELECT id FROM conversations WHERE candidate_id = p_candidate_id
     );

    INSERT INTO audit_log (action_type, target_type, target_id, performed_by, reason, metadata)
    VALUES (
        'candidate_anonymized',
        'candidate',
        p_candidate_id,
        p_admin_id,
        p_reason,
        jsonb_build_object('source', 'anonymize_candidate_fn')
    );

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION anonymize_candidate(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anonymize_candidate(UUID, UUID, TEXT) TO service_role;

-- Refresh PostgREST schema cache so the API sees the new objects immediately.
NOTIFY pgrst, 'reload schema';
```

**Verify after running:**
1. `SELECT consume_rate_limit('probe', 5, 60000);` → returns one row `(true, 4, …)`.
2. `SELECT COUNT(*) FROM audit_log;` → returns 0 (or existing rows), no error.
3. In Vercel runtime logs: `[rate-limit] DB call failed` stops appearing on new requests.
4. In the app: admin sets a joining date on a guarantee → `SELECT * FROM audit_log ORDER BY performed_at DESC LIMIT 1;` shows `placement_joining_date_set`.

**Why they were missed:** prod migrations are applied manually via SQL editor; 038/039 (security-gates bundle, 2026-06-24) were merged but never run against prod. Consider reconciling the full `supabase/migrations/` list against prod after this.
