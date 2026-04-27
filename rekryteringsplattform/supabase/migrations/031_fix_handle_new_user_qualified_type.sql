-- Fix: handle_new_user() runs with SET search_path = '' but referenced
-- `user_role` enum without schema qualification, which raises
-- "type user_role does not exist" on every direct INSERT INTO auth.users.
-- Qualify the cast to public.user_role so the trigger works under any
-- caller's search_path (Supabase auth signup, manual SQL inserts, etc.).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'company')::public.user_role,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';
