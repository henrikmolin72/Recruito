-- Allow industry to be nullable for draft jobs that haven't completed step 1
ALTER TABLE jobs ALTER COLUMN industry DROP NOT NULL;
ALTER TABLE jobs ALTER COLUMN industry SET DEFAULT '';
