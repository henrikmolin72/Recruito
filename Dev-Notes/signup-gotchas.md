# Signup gotchas (Supabase Auth + our register actions)

Learned the hard way 2026-09-06 (see [[2026-36]]).

1. **`signUp` for an existing, unconfirmed email returns the SAME user** (and re-sends the confirmation) — no error. Any "insert profile row, delete the user on failure" pattern will delete the real account. `registerCompany` / `registerRecruiter` now pre-check `profiles.email` and never `deleteUser` on a `23505` unique violation. Regression test: `src/lib/actions/auth-register.test.ts`.
2. **`signUp` for an existing, confirmed email (confirmations ON) returns a fake user with `identities: []`** — enumeration protection. Check `identities.length === 0` before doing anything with `data.user`.
3. **Password floor lives in Supabase** (`supabase/config.toml` `minimum_password_length = 10`, mirrored in prod — [[supabase-auth-config-production-sync]]). App-side `PASSWORD_MIN_LENGTH` must match, or Supabase rejects what the form accepted.
4. **Confirmation mail in prod needs custom SMTP.** Supabase's built-in sender only delivers to project team addresses (and only a few per hour); without Resend/SMTP configured in the Supabase dashboard, real signups fail with "Error sending confirmation email" (mapped to `auth.confirmationEmailFailed`). See [[resend-golive-runbook]].
5. **Auth error text → dictionary keys only** (`src/lib/auth/auth-error-key.ts`). Never echo `error.message` — provider/schema details leak, and the UI may not be Swedish.
6. **The coming-soon gate must let `/callback` through** — the confirmation link is opened wherever the mail client lives, usually without the preview cookie.
