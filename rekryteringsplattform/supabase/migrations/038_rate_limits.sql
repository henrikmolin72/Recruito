-- Durable, cross-instance rate-limit store. Replaces the in-memory globalThis
-- bucket in src/lib/security/rate-limit.ts, which was ineffective on Vercel
-- because each function isolate had its own bucket.
--
-- The table holds one row per (key, window). consume_rate_limit() is an atomic
-- upsert that increments-or-resets the row and returns whether the caller is
-- still under the limit. It's SECURITY DEFINER so it can run with the
-- service-role client (and only that client should call it — see fn comment).

CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON rate_limits (reset_at);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only the service-role client (which bypasses RLS) should read /
-- write this table. Application code calls it via consume_rate_limit().

-- Atomic consume. Returns one row with:
--   allowed             — whether this request is within the limit
--   remaining           — calls left in the current window after this one
--   retry_after_seconds — seconds until the current window resets
--   reset_at            — absolute window-reset timestamp
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

-- Only the service role should call this (it's invoked from server-side
-- API routes / server actions via the admin client).
REVOKE ALL ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
