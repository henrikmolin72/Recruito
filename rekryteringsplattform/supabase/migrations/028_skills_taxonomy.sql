-- =============================================
-- 028: Skills Taxonomy + Talent Pool
-- =============================================

-- 1. Skills taxonomy table
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,  -- lowercase-hyphenated
  category TEXT NOT NULL DEFAULT 'technical', -- 'technical', 'soft', 'language', 'tool', 'domain'
  aliases TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills USING GIN (to_tsvector('english', name));

-- 2. Candidate skills (extracted from AI screenings or manually tagged)
CREATE TABLE IF NOT EXISTS candidate_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'ai_extracted', -- 'ai_extracted', 'manual', 'cv_parsed'
  is_gap BOOLEAN NOT NULL DEFAULT FALSE,       -- TRUE = missing skill (from AI gap analysis)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, skill_id),
  UNIQUE(application_id, skill_id),
  CHECK (candidate_id IS NOT NULL OR application_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate ON candidate_skills(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_application ON candidate_skills(application_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill ON candidate_skills(skill_id);

-- 3. Job required skills
CREATE TABLE IF NOT EXISTS job_required_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_job_required_skills_job ON job_required_skills(job_id);

-- 4. Talent pool — cross-job candidate pool per company
-- Virtual: a company's talent pool = all candidates across all their jobs
-- We store explicit "saved to pool" records for cross-job reuse
CREATE TABLE IF NOT EXISTS talent_pool_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, candidate_id),
  UNIQUE(company_id, application_id),
  CHECK (candidate_id IS NOT NULL OR application_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_talent_pool_company ON talent_pool_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_talent_pool_candidate ON talent_pool_entries(candidate_id);

-- 5. Seed common skills
INSERT INTO skills (name, slug, category, aliases) VALUES
  -- Technical
  ('JavaScript', 'javascript', 'technical', ARRAY['JS', 'ECMAScript']),
  ('TypeScript', 'typescript', 'technical', ARRAY['TS']),
  ('React', 'react', 'technical', ARRAY['React.js', 'ReactJS']),
  ('Next.js', 'nextjs', 'technical', ARRAY['Next', 'NextJS']),
  ('Node.js', 'nodejs', 'technical', ARRAY['Node', 'NodeJS']),
  ('Python', 'python', 'technical', ARRAY['Python3']),
  ('Java', 'java', 'technical', ARRAY[]),
  ('C#', 'csharp', 'technical', ARRAY['.NET', 'dotnet']),
  ('Go', 'go', 'technical', ARRAY['Golang']),
  ('Rust', 'rust', 'technical', ARRAY[]),
  ('SQL', 'sql', 'technical', ARRAY['PostgreSQL', 'MySQL', 'SQLite']),
  ('PostgreSQL', 'postgresql', 'tool', ARRAY['Postgres']),
  ('MongoDB', 'mongodb', 'tool', ARRAY['Mongo']),
  ('Redis', 'redis', 'tool', ARRAY[]),
  ('Docker', 'docker', 'tool', ARRAY['Containers']),
  ('Kubernetes', 'kubernetes', 'tool', ARRAY['K8s']),
  ('AWS', 'aws', 'tool', ARRAY['Amazon Web Services', 'Amazon AWS']),
  ('Azure', 'azure', 'tool', ARRAY['Microsoft Azure']),
  ('GCP', 'gcp', 'tool', ARRAY['Google Cloud', 'Google Cloud Platform']),
  ('Terraform', 'terraform', 'tool', ARRAY['IaC']),
  ('CI/CD', 'cicd', 'tool', ARRAY['GitHub Actions', 'GitLab CI', 'Jenkins']),
  ('Git', 'git', 'tool', ARRAY['GitHub', 'GitLab', 'Bitbucket']),
  ('REST API', 'rest-api', 'technical', ARRAY['REST', 'RESTful']),
  ('GraphQL', 'graphql', 'technical', ARRAY[]),
  ('Machine Learning', 'machine-learning', 'domain', ARRAY['ML']),
  ('Data Analysis', 'data-analysis', 'domain', ARRAY['Analytics', 'Data Analytics']),
  ('Agile', 'agile', 'soft', ARRAY['Scrum', 'Kanban', 'SAFe']),
  ('Project Management', 'project-management', 'soft', ARRAY['PMP']),
  ('Leadership', 'leadership', 'soft', ARRAY['Team Lead', 'Management']),
  ('Communication', 'communication', 'soft', ARRAY[]),
  ('English', 'english', 'language', ARRAY[]),
  ('Swedish', 'swedish', 'language', ARRAY['Svenska']),
  ('German', 'german', 'language', ARRAY['Deutsch']),
  -- Business/domain
  ('Sales', 'sales', 'domain', ARRAY['B2B Sales', 'B2C Sales']),
  ('Marketing', 'marketing', 'domain', ARRAY['Digital Marketing']),
  ('Finance', 'finance', 'domain', ARRAY['Accounting', 'Financial Analysis']),
  ('HR', 'hr', 'domain', ARRAY['Human Resources', 'Recruitment']),
  ('Product Management', 'product-management', 'domain', ARRAY['PO', 'Product Owner']),
  ('UX Design', 'ux-design', 'domain', ARRAY['UI/UX', 'User Experience', 'Figma']),
  ('DevOps', 'devops', 'domain', ARRAY['SRE', 'Platform Engineering'])
ON CONFLICT (slug) DO NOTHING;

-- 6. RLS

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read skills" ON skills FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage skills" ON skills FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage candidate_skills" ON candidate_skills FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "Recruiters see their candidate skills" ON candidate_skills FOR SELECT
  USING (
    candidate_id IN (
      SELECT c.id FROM candidates c WHERE c.recruiter_id IN (
        SELECT r.id FROM recruiters r WHERE r.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "Companies see candidate skills for their jobs" ON candidate_skills FOR SELECT
  USING (
    candidate_id IN (
      SELECT c.id FROM candidates c
      JOIN jobs j ON c.job_id = j.id
      JOIN companies co ON j.company_id = co.id
      WHERE co.user_id = auth.uid()
    )
  );

ALTER TABLE job_required_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read job_required_skills" ON job_required_skills FOR SELECT USING (TRUE);
CREATE POLICY "Companies manage their job skills" ON job_required_skills FOR ALL
  USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

ALTER TABLE talent_pool_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies manage their talent pool" ON talent_pool_entries FOR ALL
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Admins see all talent pool entries" ON talent_pool_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
