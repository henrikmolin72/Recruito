-- Drop the overly-broad "any authenticated user can read any CV" SELECT policy.
-- The app serves CVs exclusively via server-side signed URLs, which bypass RLS
-- entirely and are generated only after ownership verification in server actions.
-- Removing this policy ensures no client can read CV objects directly via the
-- Supabase client SDK, even if they know or guess the storage path.
DROP POLICY IF EXISTS "Authorized users view CVs" ON storage.objects;
