-- Migration: Medium priority gaps
-- Adds rejection_reason to recruiters, attachment columns to messages

-- 1. Recruiter rejection reasons
ALTER TABLE recruiters ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Message file attachments
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- 3. Create storage bucket for message attachments (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for attachments bucket
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Anyone can read attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments');
