-- 073: (a) backfill hired_at lost by company-driven hires, (b) count
-- refund_processing as a failed guarantee, (c) refresh all perf snapshots.
-- No new tables → no GRANT needed.

UPDATE candidates c
SET hired_at = h.first_hired
FROM (
    SELECT candidate_id, MIN(created_at) AS first_hired
    FROM candidate_stage_history
    WHERE action = 'hire' OR to_stage = 'hired'
    GROUP BY candidate_id
) h
WHERE c.id = h.candidate_id
  AND c.hired_at IS NULL;
