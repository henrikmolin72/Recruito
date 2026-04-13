-- =============================================
-- 027: EU AI Act Compliance
-- Extends ai_screenings with audit fields,
-- creates ai_audit_log for full traceability
-- =============================================

-- 1. Extend ai_screenings with compliance columns
ALTER TABLE ai_screenings
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_hash TEXT,
  ADD COLUMN IF NOT EXISTS decision_context JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS human_reviewer_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS human_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_decision_support BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Create ai_audit_log for full regulatory trail
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  screening_id UUID REFERENCES ai_screenings(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,              -- 'screening_completed', 'human_reviewed', 'export_requested'
  actor_id UUID REFERENCES profiles(id),
  actor_role TEXT,                    -- 'recruiter', 'admin', 'system'
  model TEXT,
  model_version TEXT,
  prompt_hash TEXT,
  input_summary JSONB DEFAULT '{}'::jsonb,   -- non-PII summary of what was sent to AI
  output_summary JSONB DEFAULT '{}'::jsonb,  -- score, reasoning, skills
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_log_job ON ai_audit_log(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_application ON ai_audit_log(application_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_created ON ai_audit_log(created_at DESC);

-- 3. Create bias_tracking table for aggregated demographic data per job
CREATE TABLE IF NOT EXISTS ai_bias_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_screened INTEGER NOT NULL DEFAULT 0,
  total_shortlisted INTEGER NOT NULL DEFAULT 0,
  experience_distribution JSONB DEFAULT '{}'::jsonb,  -- {"0-2": {screened: 5, shortlisted: 2}, ...}
  location_distribution JSONB DEFAULT '{}'::jsonb,    -- {"Stockholm": {screened: 10, shortlisted: 4}, ...}
  score_distribution JSONB DEFAULT '{}'::jsonb,       -- {"0-25": 3, "26-50": 5, "51-75": 8, "76-100": 4}
  flags JSONB DEFAULT '[]'::jsonb,                    -- [{"type": "experience_skew", "severity": "warning", "detail": "..."}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, report_date)
);

-- 4. RLS policies

-- ai_audit_log
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON ai_audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Recruiters can view own audit logs"
  ON ai_audit_log FOR SELECT
  USING (
    actor_id = auth.uid()
  );

CREATE POLICY "Companies can view audit logs for their jobs"
  ON ai_audit_log FOR SELECT
  USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- System/admin insert only (via service role)
CREATE POLICY "Service role can insert audit logs"
  ON ai_audit_log FOR INSERT
  WITH CHECK (TRUE);

-- ai_bias_reports
ALTER TABLE ai_bias_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all bias reports"
  ON ai_bias_reports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Companies can view bias reports for their jobs"
  ON ai_bias_reports FOR SELECT
  USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage bias reports"
  ON ai_bias_reports FOR ALL
  WITH CHECK (TRUE);

-- 5. Triggers
CREATE TRIGGER update_ai_bias_reports_updated_at
  BEFORE UPDATE ON ai_bias_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
