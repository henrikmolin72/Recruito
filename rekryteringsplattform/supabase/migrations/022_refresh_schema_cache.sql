-- Refresh PostgREST schema cache to ensure all columns are visible
-- This fixes "Could not find column X in schema cache" errors

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Ensure employment_type column exists (it should from initial schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'employment_type'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN employment_type TEXT NOT NULL DEFAULT 'Full-time';
  END IF;
END
$$;
