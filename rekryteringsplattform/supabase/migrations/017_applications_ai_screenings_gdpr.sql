-- =============================================
-- MIGRATION 017: Applications, AI Screenings & GDPR CV Cleanup
-- =============================================
-- Creates the applications table (public apply flow) and
-- ai_screenings table (AI candidate screening), plus a
-- scheduled GDPR cleanup function for old CV files.

-- =============================================
-- APPLICATIONS TABLE
-- =============================================
-- Used by the public application flow (/apply/[mandateId])
-- and by recruiters viewing incoming applications.

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    cv_text TEXT,
    cover_letter_text TEXT,
    source TEXT DEFAULT 'public_apply_link',
    status TEXT NOT NULL DEFAULT 'new',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_recruiter ON applications(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at ON applications;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Recruiters can view their own applications
CREATE POLICY "Recruiters can view own applications"
    ON applications FOR SELECT
    TO authenticated
    USING (
        recruiter_id IN (
            SELECT id FROM recruiters WHERE user_id = auth.uid()
        )
    );

-- Companies can view applications for their jobs
CREATE POLICY "Companies can view applications for their jobs"
    ON applications FOR SELECT
    TO authenticated
    USING (
        job_id IN (
            SELECT id FROM jobs WHERE company_id IN (
                SELECT id FROM companies WHERE user_id = auth.uid()
            )
        )
    );

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
    ON applications FOR SELECT
    TO authenticated
    USING (is_admin());

-- Insert is done via admin client (service role), so no INSERT policy needed
-- for authenticated users (public apply goes through server action with admin client).

-- =============================================
-- AI SCREENINGS TABLE
-- =============================================
-- Stores AI screening results for applications.
-- Referenced by /api/screen and /api/generate-shortlist routes.

CREATE TABLE IF NOT EXISTS ai_screenings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'anthropic',
    model TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    match_score NUMERIC(5,2),
    gap_analysis TEXT,
    analysis_json JSONB DEFAULT '{}'::jsonb,
    top_3_skills JSONB DEFAULT '[]'::jsonb,
    interview_questions JSONB DEFAULT '[]'::jsonb,
    error_message TEXT,
    screened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ai_screenings_application UNIQUE (application_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_screenings_job ON ai_screenings(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_screenings_status ON ai_screenings(status);
CREATE INDEX IF NOT EXISTS idx_ai_screenings_application ON ai_screenings(application_id);

DROP TRIGGER IF EXISTS set_updated_at ON ai_screenings;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON ai_screenings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE ai_screenings ENABLE ROW LEVEL SECURITY;

-- Recruiters can view screenings for their applications
CREATE POLICY "Recruiters can view own screenings"
    ON ai_screenings FOR SELECT
    TO authenticated
    USING (
        application_id IN (
            SELECT id FROM applications WHERE recruiter_id IN (
                SELECT id FROM recruiters WHERE user_id = auth.uid()
            )
        )
    );

-- Companies can view screenings for their jobs
CREATE POLICY "Companies can view screenings for their jobs"
    ON ai_screenings FOR SELECT
    TO authenticated
    USING (
        job_id IN (
            SELECT id FROM jobs WHERE company_id IN (
                SELECT id FROM companies WHERE user_id = auth.uid()
            )
        )
    );

-- Admins can read and write all screenings
CREATE POLICY "Admins can manage all screenings"
    ON ai_screenings FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =============================================
-- GDPR CV CLEANUP FUNCTION
-- =============================================
-- Cleans up CV files older than 6 months from completed/rejected processes.
-- Should be scheduled to run periodically (e.g., daily via pg_cron or edge function).

CREATE OR REPLACE FUNCTION gdpr_cleanup_old_cv_files()
RETURNS TABLE (
    candidate_id UUID,
    cv_file_path TEXT,
    status TEXT
) AS $$
BEGIN
    -- Return candidates whose CV files should be cleaned up:
    -- 1. Process is terminal (rejected, declined, completed, candidate_withdrawn)
    -- 2. Status changed more than 6 months ago
    -- 3. CV file path is not null
    RETURN QUERY
    SELECT
        c.id AS candidate_id,
        c.cv_file_path,
        c.status::TEXT
    FROM candidates c
    WHERE c.cv_file_path IS NOT NULL
      AND c.status IN ('rejected', 'declined', 'completed', 'candidate_withdrawn',
                        'rejected_client', 'rejected_interview', 'offer_declined',
                        'duplicate_rejected')
      AND c.status_changed_at < NOW() - INTERVAL '6 months';

    -- Also clean up old application CV metadata
    -- (actual file deletion must happen from application code via Storage API)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to null out CV paths after files have been deleted
CREATE OR REPLACE FUNCTION gdpr_mark_cv_cleaned(p_candidate_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
    affected INTEGER;
BEGIN
    UPDATE candidates
    SET cv_file_path = NULL,
        updated_at = NOW()
    WHERE id = ANY(p_candidate_ids)
      AND cv_file_path IS NOT NULL;

    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
