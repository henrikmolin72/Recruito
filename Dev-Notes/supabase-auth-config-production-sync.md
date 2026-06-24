# Supabase Auth Config — Production Sync

`supabase/config.toml` is the canonical reference for auth settings.

**Production must match:**
- `enable_confirmations = true` (email confirmation required on signup)
- `minimum_password_length = 10`
- MFA: self-service TOTP enabled (`enroll_enabled = true`), not enforced

**How to verify:** Supabase dashboard → Authentication → Providers → Email.

**How to apply:** Set manually in the Supabase dashboard:
Authentication → Providers → Email (for confirmation + password length)
Authentication → MFA (for TOTP enrollment)

There is no `supabase config push` for auth settings — the dashboard is the source of truth for production.
