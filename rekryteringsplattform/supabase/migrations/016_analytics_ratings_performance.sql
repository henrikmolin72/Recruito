-- Migration: Analytics, Candidate Ratings, Recruiter Performance
-- Creates candidate_ratings table for the rating/review system

CREATE TABLE IF NOT EXISTS candidate_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (candidate_id, company_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_candidate_ratings_recruiter ON candidate_ratings(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_candidate_ratings_company ON candidate_ratings(company_id);
CREATE INDEX IF NOT EXISTS idx_candidate_ratings_candidate ON candidate_ratings(candidate_id);

-- RLS policies
ALTER TABLE candidate_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can manage their own ratings"
    ON candidate_ratings
    FOR ALL
    TO authenticated
    USING (
        company_id IN (
            SELECT id FROM companies WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Recruiters can view ratings about them"
    ON candidate_ratings
    FOR SELECT
    TO authenticated
    USING (
        recruiter_id IN (
            SELECT id FROM recruiters WHERE user_id = auth.uid()
        )
    );
