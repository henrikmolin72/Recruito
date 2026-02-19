-- Add 'paused' to candidate_status enum
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'paused';
