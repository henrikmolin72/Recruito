-- Data subject rights infrastructure (GDPR Art. 17, 20).
--
-- Three new objects:
--   1. audit_log               — append-only event store for admin/sensitive ops
--   2. data_rights_requests    — DSR queue (erasure / export) for admin review
--   3. anonymize_candidate(..) — PL/pgSQL function that pseudonymizes a
--                                candidate row while preserving the placement
--                                record required for accounting (BFL §7).
--
-- Erasure semantics:
--   - We do NOT delete candidate rows referenced by placements. Bokföringslagen
--     requires us to retain placement/invoice records for 7 years.
--   - We DO null/replace all PII columns. The row remains as a hollow shell
--     keyed by id, so foreign keys (placements.candidate_id, audit_log entries)
--     stay valid.
--   - We DO delete messages from conversations the candidate participated in,
--     since those aren't required by law and contain unbounded PII.
--   - The deletion event is logged in audit_log with the admin id, timestamp,
--     and the human-readable reason given in the DSR.

-- ------------------------------------------------------------------
-- audit_log
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type TEXT NOT NULL,            -- 'candidate_anonymized', 'erasure_request_completed', etc.
    target_type TEXT NOT NULL,            -- 'candidate', 'user', 'recruiter', 'company'
    target_id UUID,                       -- nullable: the target may have been deleted
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

-- ------------------------------------------------------------------
-- data_rights_requests
-- ------------------------------------------------------------------
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

    -- The subject of the request. Exactly one of these should be set:
    --   subject_user_id      — the requester is a logged-in user wanting their
    --                          own account data.
    --   subject_candidate_id — an external candidate (or recruiter on the
    --                          candidate's behalf) requesting erasure of a
    --                          specific candidate row.
    subject_user_id UUID REFERENCES profiles(id),
    subject_candidate_id UUID REFERENCES candidates(id),

    requested_by UUID REFERENCES profiles(id),  -- who submitted the request (logged-in user) — null for unauthenticated email requests
    requested_email TEXT,                       -- contact email when requester isn't logged in
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
-- Users can see their own requests; admin sees all (admin uses service-role).
CREATE POLICY data_rights_requests_select_own ON data_rights_requests
    FOR SELECT
    USING (auth.uid() = requested_by OR auth.uid() = subject_user_id);

-- ------------------------------------------------------------------
-- anonymize_candidate(p_candidate_id, p_admin_id, p_reason)
-- ------------------------------------------------------------------
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

    -- Null/replace every PII column. Keep the id and the foreign keys
    -- (job_id, recruiter_id, mandate_id) so placements and audit_log entries
    -- still resolve. CV file in storage must be deleted separately by the
    -- server action (PL/pgSQL has no Storage access).
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

    -- Delete messages from conversations this candidate was the subject of.
    -- conversations.candidate_id stays for the audit trail; the messages do not.
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
