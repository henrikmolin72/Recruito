CREATE TABLE IF NOT EXISTS job_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_announcements_job_id ON job_announcements(job_id);

ALTER TABLE job_announcements ENABLE ROW LEVEL SECURITY;

-- Company can insert announcements for their own jobs
CREATE POLICY "company_insert_announcement" ON job_announcements
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM jobs j
            JOIN companies c ON c.id = j.company_id
            WHERE j.id = job_id
            AND c.user_id = auth.uid()
        )
    );

-- Company can view their own job announcements
CREATE POLICY "company_view_announcements" ON job_announcements
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM jobs j
            JOIN companies c ON c.id = j.company_id
            WHERE j.id = job_id
            AND c.user_id = auth.uid()
        )
    );

-- Recruiters can view announcements for jobs they have mandates on
CREATE POLICY "recruiter_view_announcements" ON job_announcements
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM job_mandates jm
            JOIN recruiters rec ON rec.id = jm.recruiter_id
            WHERE jm.job_id = job_id
            AND rec.user_id = auth.uid()
        )
    );
