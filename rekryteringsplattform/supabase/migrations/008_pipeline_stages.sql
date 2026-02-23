-- =============================================
-- PIPELINE STAGES - Custom hiring process per job
-- =============================================

-- Add pipeline_stages JSONB column to jobs
-- Default pipeline: screening + one interview round
ALTER TABLE jobs
ADD COLUMN pipeline_stages JSONB NOT NULL DEFAULT '[
  {"id": "screening", "type": "screening", "title": "Screening", "order": 0},
  {"id": "interview-1", "type": "interview", "title": "Intervju 1", "order": 1}
]'::jsonb;

-- Add current_pipeline_stage to candidates
-- NULL means candidate is in initial "submitted" state (not yet placed into pipeline)
ALTER TABLE candidates
ADD COLUMN current_pipeline_stage TEXT;

-- Constraint: pipeline_stages must be a non-empty array
ALTER TABLE jobs
ADD CONSTRAINT chk_pipeline_stages_is_array
CHECK (jsonb_typeof(pipeline_stages) = 'array' AND jsonb_array_length(pipeline_stages) >= 1);

-- Constraint: max 8 stages
ALTER TABLE jobs
ADD CONSTRAINT chk_pipeline_stages_max_length
CHECK (jsonb_array_length(pipeline_stages) <= 8);

-- Index for querying candidates by pipeline stage
CREATE INDEX idx_candidates_pipeline_stage ON candidates(current_pipeline_stage)
WHERE current_pipeline_stage IS NOT NULL;

-- Backfill: Map existing candidate statuses to default pipeline stages
UPDATE candidates SET current_pipeline_stage = 'screening'
WHERE status = 'reviewing';

UPDATE candidates SET current_pipeline_stage = 'interview-1'
WHERE status = 'interview';
