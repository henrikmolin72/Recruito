# Security Gates (No API Keys) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all security gates and ENV gaps that require zero external API keys — doable in one session before Stripe work begins.

**Architecture:** Pure code/config changes: one new Supabase migration (CVS policy), one new config file (supabase/config.toml), one npm audit fix, one server-action audit-log patch, and ENV template housekeeping.

**Tech Stack:** Next.js 16 App Router, Supabase (SQL migrations), npm, TypeScript

**Already verified as DONE (do not redo):**
- sanitize-html `2.17.5` ✓ (PDF cited `2.17.3` — already upgraded)
- next `16.2.9` ✓
- Rate-limit on `login` and `requestPasswordReset` ✓ (`auth.ts` lines 77, 320)
- `logSafeError()` in auth.ts ✓
- Audit log in `sendPlacementInvoice`, `recordPlacementPayment`, `reportGuaranteeFailure` ✓

---

## Task 1: npm audit fix (S3 — 2 moderate CVEs)

**Files:**
- Modify: `rekryteringsplattform/package.json`
- Modify: `rekryteringsplattform/package-lock.json` (auto-updated)

Current state: `npm audit` shows 2 moderate vulnerabilities — `next` (canary range) and `postcss <8.5.10`, both marked fixable.

- [ ] **Step 1: Run audit fix**

```bash
cd rekryteringsplattform
npm audit fix
```

Expected output: something like "2 vulnerabilities fixed". If it says "0 vulnerabilities fixed", re-run `npm audit` and check the output carefully before continuing.

- [ ] **Step 2: Verify clean**

```bash
npm audit
```

Expected: `found 0 vulnerabilities`. If moderate/high/critical remain and are NOT fixable automatically, add an `overrides` block to `package.json` to pin the transitive dep:

```json
"overrides": {
  "postcss": "^8.5.10"
}
```

Then re-run `npm install` and `npm audit`.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: exits 0. If it fails, check for type errors introduced by the version bump and fix them before committing.

- [ ] **Step 4: Commit**

```bash
cd ..
git add rekryteringsplattform/package.json rekryteringsplattform/package-lock.json
git commit -m "fix(deps): npm audit fix — patch moderate CVEs (next canary range, postcss)"
```

---

## Task 2: Tighten CVS storage SELECT policy (S4)

**Files:**
- Create: `rekryteringsplattform/supabase/migrations/058_tighten_cvs_storage_policy.sql`

**Context:** Migration 003 created a SELECT policy that allows ANY authenticated user to read ANY CV object if they know/guess the path (`bucket_id='cvs' AND auth.uid() IS NOT NULL`). The app never uses this policy — CVs are only ever served via server-generated signed URLs after server-side ownership checks. Dropping the broad SELECT policy makes the storage layer consistent with the actual access model: only signed URLs work.

- [ ] **Step 1: Create the migration file**

```sql
-- rekryteringsplattform/supabase/migrations/058_tighten_cvs_storage_policy.sql

-- Drop the overly-broad "any authenticated user can read any CV" SELECT policy.
-- The app serves CVs exclusively via server-side signed URLs, which bypass RLS
-- entirely and are generated only after ownership verification in server actions.
-- Removing this policy ensures no client can read CV objects directly via the
-- Supabase client SDK, even if they know or guess the storage path.
DROP POLICY IF EXISTS "Authorized users view CVs" ON storage.objects;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the Supabase MCP `apply_migration` tool with:
- `name`: `058_tighten_cvs_storage_policy`
- `query`: the SQL above

- [ ] **Step 3: Verify no CV regressions**

Confirm that the existing signed-URL flow still works by checking the server action that generates them. Find the file:

```bash
grep -r "createSignedUrl\|signedUrl\|signed_url" rekryteringsplattform/src --include="*.ts" -l
```

Read the function that calls `createSignedUrl` for CVs. Verify it uses `createAdminClient()` (which bypasses RLS and doesn't need the SELECT policy) — not the user-facing `createClient()`.

- [ ] **Step 4: Commit**

```bash
git add rekryteringsplattform/supabase/migrations/058_tighten_cvs_storage_policy.sql
git commit -m "fix(security): drop broad CVS storage SELECT policy — rely solely on signed URLs (S4)"
```

---

## Task 3: Add processGuaranteeExpirations audit log

**Files:**
- Modify: `rekryteringsplattform/src/lib/actions/placements.ts` (around line 291)

**Context:** `processGuaranteeExpirations()` releases payouts (sets `status: "payout_released"`, `payout_released_at`, `completed_at`) inside a loop but never writes to `audit_log`. The three other financial mutations (`sendPlacementInvoice`, `recordPlacementPayment`, `reportGuaranteeFailure`) all have audit entries — this one is the only gap. The function is admin-only and already calls `requireAdmin()` but doesn't capture the returning user for the audit `performed_by` field.

- [ ] **Step 1: Capture adminUser from requireAdmin()**

In `placements.ts`, find the line (around 265):
```typescript
export async function processGuaranteeExpirations() {
    await requireAdmin();
```

Change it to:
```typescript
export async function processGuaranteeExpirations() {
    const { user: adminUser } = await requireAdmin();
```

- [ ] **Step 2: Add audit log insert inside the for-loop, after the successful payout update**

Find the block (around line 289-295) where the placement update succeeds. After the `if (error) { ... continue; }` guard and before the candidate update, add:

```typescript
        // Audit trail: guarantee period expired, payout auto-released.
        const { error: auditError } = await admin.from("audit_log").insert({
            action_type: "placement_payout_auto_released",
            target_type: "placement",
            target_id: placement.id,
            performed_by: adminUser.id,
            metadata: { recruiter_fee: placement.recruiter_fee, currency: placement.salary_currency },
        });
        if (auditError) console.error("[audit:placement_payout_auto_released]", { code: auditError.code, message: auditError.message });
```

- [ ] **Step 3: Build check**

```bash
cd rekryteringsplattform && npm run build
```

Expected: exits 0. Fix any TypeScript errors before committing.

- [ ] **Step 4: Commit**

```bash
cd ..
git add rekryteringsplattform/src/lib/actions/placements.ts
git commit -m "fix(audit): add missing audit log to processGuaranteeExpirations payout release"
```

---

## Task 4: Create supabase/config.toml (S5)

**Files:**
- Create: `rekryteringsplattform/supabase/config.toml`

**Context:** No `config.toml` exists — auth settings (email confirmation enforcement, minimum password length, MFA) live only in the Supabase dashboard, unverifiable from the repo. The registration flow sets `emailRedirectTo`, implying confirmation is intended but enforcement is unproven.

This file is the **local dev + CI reference**. It does not automatically change the production Supabase project — that must be done via the Supabase dashboard or CLI push. But committing it makes the intended auth config reviewable and enforceable in local/staging.

- [ ] **Step 1: Create the file**

```toml
# rekryteringsplattform/supabase/config.toml
# Local development and CI configuration for Supabase.
# Production values must be kept in sync via the Supabase dashboard.
# See: https://supabase.com/docs/guides/local-development/cli/config

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[api.tls]
enabled = false

[db]
port = 54322
shadow_port = 54320
major_version = 15

[db.pooler]
enabled = false
port = 54329
pool_mode = "transaction"
default_pool_size = 20
max_client_conn = 100

[realtime]
enabled = true

[studio]
enabled = true
port = 54323
api_url = "http://127.0.0.1"
openai_api_key = "env(OPENAI_API_KEY)"

[inbucket]
enabled = true
port = 54324
smtp_port = 54325
pop3_port = 54326

[storage]
enabled = true
file_size_limit = "10MiB"

[auth]
enabled = true
# Site URL — overridden by NEXT_PUBLIC_APP_URL in production.
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["http://127.0.0.1:3000"]
jwt_expiry = 3600
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10
enable_signup = true
enable_anonymous_sign_ins = false
enable_manual_linking = false
# Minimum password length: 10 characters (production must match).
minimum_password_length = 10
password_requirements = ""

[auth.email]
enable_signup = true
double_confirm_changes = true
# Email confirmation is required — enforced in production via Supabase dashboard.
enable_confirmations = true
secure_email_change_enabled = true
max_frequency = "1s"
otp_length = 6
otp_expiry = 3600

[auth.sms]
enable_signup = false
enable_confirmations = false
max_frequency = "5s"

[auth.mfa]
# MFA decision: optional for company/recruiter users; not enforced at launch.
# Supabase supports TOTP — enable self-service MFA post-launch.
max_enrolled_factors = 10

[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true

[auth.mfa.phone]
enroll_enabled = false
verify_enabled = false

[auth.sessions]
timebox = "24h"
inactivity_timeout = "8h"

[edge_runtime]
enabled = true
policy = "per_worker"
inspector_port = 8083

[analytics]
enabled = false
port = 54327
backend = "postgres"
```

- [ ] **Step 2: Commit**

```bash
git add rekryteringsplattform/supabase/config.toml
git commit -m "feat(config): commit supabase/config.toml with auth settings (email confirm, pwd length 10, MFA) (S5)"
```

- [ ] **Step 3: Document the production sync requirement**

Add a note to `Dev-Notes/` so it doesn't get forgotten:

Create `Dev-Notes/supabase-auth-config-production-sync.md`:

```markdown
# Supabase Auth Config — Production Sync

`supabase/config.toml` is the canonical reference for auth settings.

**Production must match:**
- `enable_confirmations = true` (email confirmation required)
- `minimum_password_length = 10`
- MFA: self-service TOTP enabled, not enforced

**How to verify:** Supabase dashboard → Authentication → Providers → Email.

**How to apply:** `supabase link --project-ref <ref>` then `supabase config push`
(or set manually in the dashboard if CLI access is unavailable).
```

```bash
git add Dev-Notes/supabase-auth-config-production-sync.md
git commit -m "docs: add note on supabase auth config production sync requirement"
```

---

## Task 5: ENV template housekeeping

**Files:**
- Modify: `rekryteringsplattform/.env.example`
- Modify: `rekryteringsplattform/.env.test.local.example`

**Context (three gaps found):**
1. `PREVIEW_TOKEN` — referenced in `middleware.ts:5` (coming-soon gate) but not in `.env.example`. Value is low-entropy/guessable per the PDF.
2. `NEXT_PUBLIC_APP_NAME` — is in `.env.example` line 9 but is dead (never read in code per the audit).
3. `E2E_SUPABASE_PROJECT_REF` and `E2E_ALLOW_PRODUCTION` — referenced in `e2e/setup-test-recruiter.ts:24-26` but not documented in `.env.test.local.example`.

- [ ] **Step 1: Update .env.example**

Current line 9: `NEXT_PUBLIC_APP_NAME=Recruito`

Remove it (it's dead). Add `PREVIEW_TOKEN` in the Auth section. The file should look like:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=https://your-production-domain

# "Coming soon" gate — must be a high-entropy random string (≥32 chars).
# Set in Vercel env vars. Remove or leave unset to disable the gate entirely.
PREVIEW_TOKEN=

# Email — Resend (primary)
RESEND_API_KEY=re_...
EMAIL_FROM=Recruito <no-reply@recruito.eu>
# Internal review address — receives recruiter signup notifications. MUST be set.
INTERNAL_REVIEW_EMAIL=

# Email — SMTP fallback (optional, used if Resend fails or is not set)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM=Recruito <no-reply@recruito.eu>

# AI (Anthropic Claude — used for CV screening, shortlist, cv-match)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6

# Cron security (Vercel injects Authorization: Bearer $CRON_SECRET automatically)
CRON_SECRET=your-random-secret

# Sentry — observability. Optional; SDK no-ops when these are unset.
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
# Auth token only needed for source-map uploads at build time. Vercel-only.
SENTRY_AUTH_TOKEN=

# Landing page demo video (optional).
NEXT_PUBLIC_LANDING_DEMO_YOUTUBE_URL=
```

- [ ] **Step 2: Update .env.test.local.example**

Add the two undocumented safety guards. Append to the existing file:

```bash
# Production-safety guards — prevent e2e suite from running against prod.
# E2E_SUPABASE_PROJECT_REF: the ref of your STAGING project (not prod).
# E2E_ALLOW_PRODUCTION: leave UNSET in all environments. Only set to "true"
# if you intentionally want the suite to run against production (dangerous).
E2E_SUPABASE_PROJECT_REF=
# E2E_ALLOW_PRODUCTION=true  # DO NOT SET — here for documentation only
```

- [ ] **Step 3: Build check to confirm removing NEXT_PUBLIC_APP_NAME is safe**

```bash
cd rekryteringsplattform && grep -r "NEXT_PUBLIC_APP_NAME" src --include="*.ts" --include="*.tsx" | head -5
```

Expected: no results. If any files reference it, wire it up rather than deleting it.

- [ ] **Step 4: Commit**

```bash
cd ..
git add rekryteringsplattform/.env.example rekryteringsplattform/.env.test.local.example
git commit -m "fix(env): add PREVIEW_TOKEN to template, remove dead APP_NAME, document E2E safety vars"
```

---

## Self-review

**Spec coverage:**
- S3 (npm audit) → Task 1 ✓
- S4 (cvs storage policy) → Task 2 ✓
- S5 (config.toml) → Task 4 ✓
- processGuaranteeExpirations audit gap → Task 3 ✓
- ENV template gaps → Task 5 ✓

**Out of scope for this plan (require external services or separate spec):**
- Stripe integration (needs account + keys)
- E2E GitHub Actions secrets (needs Vercel/GitHub tokens)
- Job form rework (needs client spec finalized)
- Recruiter⇄company messaging (Tier 2, separate plan)
- CSP nonce/hash (post-launch recommended — requires nonce injection in Next.js middleware, non-trivial)

**Execution order:** Tasks 1 → 3 → 5 → 2 → 4. Task 1 first (build must be clean before adding migration). Task 2 last because it touches production DB. Task 4 last because config.toml is documentation-level; production sync is manual.
