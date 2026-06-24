# Deployment Runbook — Recruito

> **Last updated:** 2026-06-24
> **Target:** Vercel (Next.js 16 App Router) + Supabase (Postgres, Auth, Storage)
> **App root:** `rekryteringsplattform/`

This runbook covers a production deploy from a clean state. Follow top-to-bottom for a first launch; for routine redeploys, sections 1 (DB) and 5 (deploy) are the usual path.

---

## 0. Pre-flight (do once before first launch)

- [ ] Supabase project created (prod) — note the project ref, URL, anon key, service-role key
- [ ] Vercel project created and linked to the GitHub repo (`henrikmolin72/Recruito`)
- [ ] Production domain ready in DNS (see §4)
- [ ] Anthropic API key provisioned
- [ ] Email provider ready: Resend API key **or** SMTP credentials
- [ ] Stripe account + Connect enabled (when payments land — see §6)

---

## 1. Database — apply migrations

Migrations live in `rekryteringsplattform/supabase/migrations/`, numbered `001`..`060`. They MUST be applied in order, with no gaps.

**Critical dependencies:**
- `052` + `053` (candidate stage-progression) — app code depends on them; deploy fails behavior without them.
- `057` + `058` (RLS recursion fixes) — without these, company + recruiter login returns 500.
- `059` (CVS storage policy tighten) — **already applied to prod 2026-06-24**.
- `060` (split shared Recruito chat into private per-party threads) — **special rollout, not a plain in-order apply.** Splits existing `conversation_type='recruito'` rows into `recruito_company`/`recruito_recruiter` and adds `UNIQUE(candidate_id, conversation_type)`. It is **idempotent**. Recommended order: **(1) apply `060` first** (safe while old code is live — old code only writes the legacy `recruito` type, which `060` re-splits), **(2) deploy the new app code** (reads/writes the per-party types), **(3) re-run `060`** to mop up any legacy rows written during the deploy overlap. Applying it first avoids a window where users see empty Recruito tabs. Prod `recruito` data is effectively empty (messaging only worked from 2026-06-22), so impact is minimal either way. See [Decisions/2026-06-24-split-recruito-threads.md](../Decisions/2026-06-24-split-recruito-threads.md).

### Apply via Supabase CLI (preferred)
```bash
cd rekryteringsplattform
supabase link --project-ref <PROD_PROJECT_REF>
supabase db push        # applies any unapplied migrations in order
supabase migration list # verify local == remote, no gaps
```

### Apply via dashboard (fallback)
Supabase Dashboard → SQL Editor → paste each unapplied migration file's contents in numeric order. Confirm each succeeds before the next.

### Verify
```sql
-- In SQL editor: confirm the CVS policy was dropped (059)
SELECT policyname FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname = 'Authorized users view CVs';
-- Expected: 0 rows
```

### Auth config (no migration — dashboard only)
`supabase/config.toml` is the repo reference but auth settings have no CLI push. Set in **Authentication → Providers → Email**:
- [ ] Confirm email = **ON**
- [ ] Minimum password length = **10**
- [ ] MFA → enable TOTP enrollment

(See [supabase-auth-config-production-sync.md](supabase-auth-config-production-sync.md).)

---

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

Set all of these for the **Production** environment. `[SECRET]` = never expose / never prefix with `NEXT_PUBLIC_`.

### Required
| Var | Type | Notes |
|-----|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | public | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | RLS-protected client key |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET** | bypasses RLS — server only |
| `NEXT_PUBLIC_APP_URL` | public | prod domain, e.g. `https://recruito.eu` — drives auth callback redirects |
| `ANTHROPIC_API_KEY` | **SECRET** | CV screening / shortlist / cv-match |
| `CRON_SECRET` | **SECRET** | high-entropy random; Vercel sends it as `Authorization: Bearer` to cron routes |
| `INTERNAL_REVIEW_EMAIL` | public | receives recruiter-signup notices — **must be set** |

### Email — at least ONE provider (else sends are skipped + warned)
| Var | Type | Notes |
|-----|------|-------|
| `RESEND_API_KEY` | **SECRET** | primary provider |
| `EMAIL_FROM` | public | has default; set to `Recruito <no-reply@recruito.eu>` |
| `SMTP_HOST` / `SMTP_PORT` | public | fallback only |
| `SMTP_USER` | sensitive | fallback credential |
| `SMTP_PASS` | **SECRET** | fallback |
| `SMTP_FROM` | public | fallback for `EMAIL_FROM` |

### Optional
| Var | Type | Notes |
|-----|------|-------|
| `ANTHROPIC_MODEL` | public | defaults to `claude-sonnet-4-6` |
| `PREVIEW_TOKEN` | SECRET-ish | "coming soon" gate. Use ≥32-char random. **Remove/rotate at GA.** Leave unset to disable the gate. |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | mixed | observability; SDK no-ops if unset |
| `SENTRY_ORG` / `SENTRY_PROJECT` | public | build-time |
| `SENTRY_AUTH_TOKEN` | **SECRET** | source-map upload at build only |
| `NEXT_PUBLIC_LANDING_DEMO_YOUTUBE_URL` | public | landing video |

### Do NOT set (Vercel injects automatically)
`VERCEL_ENV`, `NEXT_PUBLIC_VERCEL_ENV`, `NODE_ENV`, `NEXT_RUNTIME`, `VERCEL_OIDC_TOKEN`

### Stripe (add when payments land — §6)
`STRIPE_SECRET_KEY` [SECRET], `STRIPE_WEBHOOK_SECRET` [SECRET], `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` [public], `STRIPE_CONNECT_CLIENT_ID`

---

## 3. GitHub Actions secrets (CI / E2E)

Required for the `e2e-preview` workflow to pass (launch-quality gate). Repo → Settings → Secrets and variables → Actions.

See [e2e-ci-secrets-setup.md](e2e-ci-secrets-setup.md) for the full list (10 secrets): `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, the E2E account creds (`E2E_COMPANY_*`, `E2E_ADMIN_*`, `E2E_RECRUITER_*`), and the prod-safety guards `E2E_SUPABASE_PROJECT_REF` + `E2E_ALLOW_PRODUCTION`.

> ⚠️ **Never** set `E2E_ALLOW_PRODUCTION=true` against the prod project. The guard exists to keep the suite off production data.

---

## 4. DNS / domain

1. Vercel → Project → Settings → Domains → add the production domain (e.g. `recruito.eu`).
2. Add the DNS records Vercel shows (A / CNAME) at your registrar.
3. Wait for SSL to provision (Vercel auto-issues).
4. Set `NEXT_PUBLIC_APP_URL` to the final `https://` domain (§2) — auth callbacks break if this mismatches the actual domain.
5. In Supabase → Authentication → URL Configuration: add the prod domain to **Site URL** and **Redirect URLs** (`https://recruito.eu/callback`, `https://recruito.eu/reset-password`).

---

## 5. Deploy & cron verification

### Deploy
Push to `main` → Vercel auto-builds and deploys. Or trigger manually in the Vercel dashboard.

```bash
# Local sanity before pushing
cd rekryteringsplattform
npm run build      # must exit 0
npm audit          # expect 0 critical/high
```

### Cron jobs (configured in `vercel.json`)
| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/guarantee/reminders` | `0 8 * * *` (08:00 UTC daily) | 90-day guarantee reminders (30/14/7/1d) |
| `/api/cron/mandate-expiry` | `0 7 * * *` (07:00 UTC daily) | mandate 10-day expiry + recycle |

Both verify the `CRON_SECRET` bearer token. After first deploy:
- [ ] Vercel → Project → Cron Jobs — confirm both are registered and enabled
- [ ] Trigger each once manually and confirm 200 (not 401 — 401 means `CRON_SECRET` mismatch)

---

## 6. Stripe go-live (when payments are built)

1. Add the 4 Stripe env vars (§2) — start with **test** keys.
2. Register the webhook endpoint in the Stripe dashboard → copy signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Run a full test-mode flow: company checkout → `charge.succeeded` webhook → placement advances → payout → refund via guarantee-breach.
4. Swap to **live** keys only after the test flow is green and the payment code has had its focused security review.

---

## 7. Post-deploy smoke checks

- [ ] Load the prod URL — landing page renders (or `PREVIEW_TOKEN` gate if still enabled)
- [ ] Register a test company → email confirmation arrives → login works
- [ ] Recruiter signup → `INTERNAL_REVIEW_EMAIL` receives the notice
- [ ] Upload a CV → served via signed URL (not a 403 — confirms storage policy intact)
- [ ] Trigger an AI screening → returns structured result
- [ ] Check Vercel logs + Sentry (if configured) for errors

---

## Rollback

- **Code:** Vercel → Deployments → promote the previous good deployment (instant).
- **DB migrations:** forward-only. Do **not** auto-rollback a migration in prod — write a new compensating migration. (Migrations here have no down-scripts.)
- **Env vars:** changes take effect on next deploy/redeploy, not retroactively.

---

## Security reminders (from the 2026-06-21 audit)

- `SUPABASE_SERVICE_ROLE_KEY` and `VERCEL_OIDC_TOKEN` grant full RLS-bypass. They sit in plaintext in gitignored `.env.local` / `.vercel/.env.production.local` on dev machines — treat local-disk exposure as a real risk. Never commit them.
- Rotate/strengthen `PREVIEW_TOKEN` (currently low-entropy) or remove the gate entirely at GA.
- No secret is exposed via any `NEXT_PUBLIC_` prefix — keep it that way.
