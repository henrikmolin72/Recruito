# Recruito — Step-by-Step Action Plan to Launch

> **Updated:** 2026-06-24 · Supersedes the 2026-06-21 Production Readiness Breakdown
> **Scope:** `rekryteringsplattform/` (Next.js 16 App Router + Supabase)
> **Status:** Security gate **cleared**. Two hard blockers remain (Stripe, E2E secrets) plus form rework.

---

## Where we are now

The no-API-key security gate is **done and on `origin/main`** (commits `ce5abcb`..`3e29d3b`). Migration `059` is **applied to production** (confirmed 2026-06-24).

Several items from the original audit were **already fixed** before this pass (verified, not redone): `sanitize-html` 2.17.5, `next` 16.2.9, login/password-reset rate-limiting, safe error logging, and audit logs on the three core financial mutations.

**Remaining blockers are all external-dependency work** — nothing else is gated on code we can write blind.

---

## ✅ DONE — Security gate (this session, 2026-06-24)

| # | Item | Commit | Notes |
|---|------|--------|-------|
| S1 | sanitize-html ≥2.17.4 | — | Already 2.17.5 |
| S2 | next ≥16.1.7 | — | Already 16.2.9 |
| S3 | npm audit clean | `ce5abcb` | postcss override; **0 vulnerabilities** |
| S4 | Tighten CVS storage SELECT policy | `2b24b3c` | Migration `059` **applied to prod** ✓ |
| S5 | Supabase auth config in repo | `3e29d3b` | `config.toml` committed (see manual step below) |
| S6 | Rate-limit login / reset | — | Already in `auth.ts` |
| — | Audit log on `processGuaranteeExpirations` | `d8b76a4` | Last financial mutation gap closed |
| — | ENV template cleanup | `5206b67` | `PREVIEW_TOKEN` added, dead `APP_NAME` removed |

### ⚠️ One manual config step still open (S5 production side)
Auth settings have no CLI push — set in the **Supabase dashboard**:
- **Authentication → Providers → Email**: Confirm email = ON, Minimum password length = 10
- **Authentication → MFA**: enable TOTP enrollment

Reference: [Dev-Notes/supabase-auth-config-production-sync.md](Dev-Notes/supabase-auth-config-production-sync.md)

---

## 🔴 BLOCKER 1 — Stripe payment integration

**Why it gates launch:** the revenue engine. Company billing + recruiter earnings pages render data but collect/pay nothing. Currently a stub (`placements.ts` records transitions only; `stripe` package not installed).

**Prerequisite:** a Stripe account (live + test keys, Connect enabled).

### Steps
1. **Create Stripe account** → enable Stripe Connect (Express). Collect test keys.
2. **Add env vars** (template already noted): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_CONNECT_CLIENT_ID`.
3. **Install** `stripe` npm package.
4. **Company checkout** — checkout session + payment intent, wired to `sendPlacementInvoice` / `recordPlacementPayment`.
5. **Recruiter Connect onboarding** — Express account + account links; persist to the existing unused `recruiters.stripe_connect_id` column.
6. **Webhook handlers** — `charge.succeeded` / `charge.failed` / payout events → advance placement status.
7. **Payout automation** — transfer to recruiter Connect account on guarantee release.
8. **Refund flow** — wire to existing `reportGuaranteeFailure` (already sets `refund_amount`).
9. **Focused security review** of payment/payout/refund code (highest-risk surface).

**Est:** ~5 working days. **Verify:** test-mode end-to-end charge → payout → refund.

---

## 🔴 BLOCKER 2 — E2E test infrastructure (launch-quality gate)

**Why it gates launch:** 7 Playwright tests on critical flows can't run; CI `e2e-preview` failing for lack of secrets.

**Prerequisite:** Vercel + GitHub tokens.

### Steps
1. Add the **10 GitHub Actions secrets** (see [Dev-Notes/e2e-ci-secrets-setup.md](Dev-Notes/e2e-ci-secrets-setup.md)): `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, the E2E account creds, and the two prod-safety guards (`E2E_SUPABASE_PROJECT_REF`, `E2E_ALLOW_PRODUCTION` — now in the template).
2. Re-run `e2e-preview` workflow → confirm green.
3. Get the suite green **before** shipping payment code (so Stripe changes are covered).

**Est:** ~1 day.

---

## 🟠 BLOCKER 3 — Job creation form rework

**Why it matters:** ~30–40% misaligned with client spec. Cascades to DB + tests, so finalize spec **before** building.

**Prerequisite:** client sign-off on the spec.

### Steps
1. **Finalize spec with client** (do this now — blocks the rest).
2. New migration: ~7 new/changed columns.
3. Calculator EUR → SEK + threshold adjustment.
4. Remove 6 duplicate fields (tools, min_years, degree, certs, technical_skills, industry_exp).
5. Structured team fields (management_required, team_size, reporting_to).
6. Dynamic key requirements (1–5) + multi-language array (up to 3 w/ levels).
7. Screening: num_interviews + interview_conductors.
8. Always-visible "Complete & Publish" + clickable step indicators.
9. **Form i18n** — extract ~50–80 hardcoded Swedish strings into all dictionaries (en/sv/da/no).

**Est:** ~2 days (i18n folded in). File: `src/app/(dashboard)/company/jobs/new/create-job-form.tsx`.

---

## 🟡 TIER 2 — Recruiter ⇄ Company messaging (can launch without)

Stub today (`messages.ts`, no UI). Supabase Realtime available. ~1,000 LOC, ~3 days. Ship post-MVP if timeline tightens.

---

## 🟢 POST-LAUNCH POLISH (non-gating)

- Email delivery test in staging (Resend + SMTP fallback — works, untested live)
- AI screening result caching/dedup + batch endpoint
- CSP: nonce/hash-based, drop `'unsafe-inline'` from script-src
- Self-service 2FA/MFA for company + recruiter
- Rotate/strengthen `PREVIEW_TOKEN` at GA (low-entropy currently)
- Integration/API-level test coverage; perf profiling for large pipelines
- Admin polish: audit-log viewer UI, bulk job actions, analytics charts, system-health dashboard

---

## INFRA / RELEASE CHECKLIST

- [x] Apply migrations through 059 in production *(053 + 059 confirmed applied)*
- [ ] Configure all REQ env vars in Vercel prod: Supabase (3), `ANTHROPIC_API_KEY`, `CRON_SECRET`, email provider (`RESEND_API_KEY` + `INTERNAL_REVIEW_EMAIL`), `NEXT_PUBLIC_APP_URL` + Stripe keys
- [ ] Sync Supabase auth config in dashboard (email confirm, pwd length 10, MFA) — **S5 manual step**
- [ ] Add 10 GitHub Actions secrets; confirm `e2e-preview` passes
- [ ] Verify email delivery in staging
- [ ] Write deployment runbook (migrations, env, secrets, DNS, Stripe keys)

## VERIFY (per project gate)

- [x] `npm run build` passes in `rekryteringsplattform/`
- [x] `npm audit`: **0 critical/high** (0 total)
- [ ] Unit + E2E green (E2E blocked on secrets)

---

## Critical path to launch (from 2026-06-24)

```
1. Finalize job-form spec with client      ← do NOW (unblocks form work)
2. Create Stripe account                    ← do NOW (unblocks 5 days of work)
3. Sync Supabase auth dashboard config      ← 15 min, do today
   ───────────────────────────────────────
4. E2E secrets + green suite ............... 1 day
5. Stripe integration ...................... 5 days
6. Job form rework + migration + i18n ...... 2 days
7. Messaging MVP (optional) ................ 3 days
8. Testing & QA + Stripe security review ... 3 days
   ───────────────────────────────────────
   TOTAL (Tier-1 only) ~11 days → mid-July 2026
```

**Top 3 right now:** (1) finalize form spec, (2) open Stripe account, (3) flip the three Supabase dashboard auth settings.
