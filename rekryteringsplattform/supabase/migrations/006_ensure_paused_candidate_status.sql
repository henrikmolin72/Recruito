-- Ensure paused candidate status exists in all environments
ALTER TYPE candidate_status ADD VALUE IF NOT EXISTS 'paused';
