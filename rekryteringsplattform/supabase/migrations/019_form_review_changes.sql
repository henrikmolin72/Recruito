-- Migration: Form review changes
-- Adds new columns for: management structure, key requirements,
-- language requirements (multi), interview details (number + conductor)

-- 1. Management / Team structure fields
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS management_required boolean DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS team_size integer;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS reporting_to text;

-- 2. Key requirements (1-5 items, stored as text array)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS key_requirements text[] DEFAULT '{}';

-- 3. Language requirements (up to 3 languages with levels, stored as jsonb array)
-- Each element: {"language": "English", "level": "fluent"}
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS language_requirements jsonb DEFAULT '[]';

-- 4. Interview details (replaces interview_type)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS num_interviews integer;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interview_conductors text;

-- 5. Expand guarantee_period_months to allow 3 months (for form consistency)
-- The existing CHECK constraint (if any) may limit to 0-2; update to 0-3
-- No constraint change needed if using Zod validation only

-- Note: Old columns (tools_technologies, min_years_experience, required_degree,
-- required_certifications, required_technical_skills, required_industry_experience,
-- interview_type) are kept nullable for backwards compatibility but will no longer
-- be populated by the form.
