# E2E tests

Playwright suite covering the admin fee re-confirmation gate.

## First-time setup

1. `cp .env.test.local.example .env.test.local` and fill in:
   - `E2E_COMPANY_EMAIL` / `E2E_COMPANY_PASSWORD` (a real Supabase auth user)
   - `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (same user is fine if it has admin role)
2. `npm run test:e2e:install` — installs the Chromium browser for Playwright.
3. `npm run test:e2e:setup` — promotes the test user to `app_metadata.role=admin` and creates an "E2E Test Co" company. Idempotent.

## Run

```bash
npm run dev               # in one terminal
npm run test:e2e          # in another
```

Open `playwright-report/index.html` after a run for the HTML report.

## What the suite does

- Seeds jobs directly into the DB (`status=pending_approval`) via `helpers/seed-job.ts` — bypasses the create-job UI wizard, which is unrelated to the gate logic.
- All seeded jobs use the `E2E-` title prefix and are deleted in `beforeAll` / `afterAll`.
- Forces the UI locale to English via the `NEXT_LOCALE=en` cookie so selectors don't depend on Swedish translations.
- Runs each test with two isolated `BrowserContext`s (company persona + admin persona).

## Updating selectors

If a UI label changes, update the regex in `fee-reconfirm.spec.ts` only — helpers should stay stable.
