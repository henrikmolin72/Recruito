-- Kör denna FÖRST för att rensa ALLT

-- Drop RLS helper functions (CASCADE tar bort alla beroende policies)
DROP FUNCTION IF EXISTS auth_role() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS get_company_id() CASCADE;
DROP FUNCTION IF EXISTS get_recruiter_id() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS on_mandate_change ON job_mandates;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at ON placements;
DROP TRIGGER IF EXISTS set_updated_at ON candidates;
DROP TRIGGER IF EXISTS set_updated_at ON jobs;
DROP TRIGGER IF EXISTS set_updated_at ON recruiters;
DROP TRIGGER IF EXISTS set_updated_at ON companies;
DROP TRIGGER IF EXISTS set_updated_at ON profiles;

-- Drop functions
DROP FUNCTION IF EXISTS update_job_recruiter_count() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- Drop tables
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS placements CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS job_mandates CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS recruiters CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop types
DROP TYPE IF EXISTS recruiter_approval CASCADE;
DROP TYPE IF EXISTS placement_status CASCADE;
DROP TYPE IF EXISTS candidate_status CASCADE;
DROP TYPE IF EXISTS job_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
