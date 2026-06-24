# E2E CI — secrets setup runbook

**Status:** e2e (`E2E — Preview` workflow) fails on every PR. Root cause found 2026-06-01.

## Root cause
The repo has **no GitHub Actions secrets** (`gh secret list` is empty). The workflow
references `secrets.VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`,
`VERCEL_AUTOMATION_BYPASS_SECRET` (resolve step) plus `E2E_*` logins and Supabase
keys (test step). With no secrets they expand to empty → the Vercel API call is
unauthenticated → returns no deployments → the resolver loops 60× (~10 min) and
fails with "No READY Vercel preview found", before any test runs.

This is **not** a code bug in the resolver. (A separate latent resolver bug —
`target=preview` excluding git previews that have `target=null` — was fixed in
PR #26; that fix must be on `main` for e2e to work once secrets exist.)

## Prerequisite
- [ ] Merge **PR #26** (`ci/e2e-resolve-preview-target`) — the `target=null`
      resolver fix. e2e cannot pass without it even with valid secrets.

## Secrets to add (GitHub → Settings → Secrets and variables → Actions)

Non-secret (values known, from `rekryteringsplattform/.vercel/project.json`):
```bash
gh secret set VERCEL_PROJECT_ID --body "prj_rDYgpsInusaqzfwDYEu8rOANq67z"
gh secret set VERCEL_TEAM_ID    --body "team_aQLOQkcsP6IuvHPoecURviVj"
```

Sensitive (obtain the values, then set):
- `VERCEL_TOKEN` — Vercel → Account Settings → Tokens (scope: the team).
- `VERCEL_AUTOMATION_BYPASS_SECRET` — Vercel → Project → Settings → Deployment
  Protection → "Protection Bypass for Automation" (enable it; copy the secret).
- `E2E_COMPANY_EMAIL`, `E2E_COMPANY_PASSWORD` — a seeded test company login.
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` — a seeded test admin login.
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key (test/staging project).

```bash
gh secret set VERCEL_TOKEN                     # paste when prompted
gh secret set VERCEL_AUTOMATION_BYPASS_SECRET
gh secret set E2E_COMPANY_EMAIL
gh secret set E2E_COMPANY_PASSWORD
gh secret set E2E_ADMIN_EMAIL
gh secret set E2E_ADMIN_PASSWORD
gh secret set NEXT_PUBLIC_SUPABASE_URL
gh secret set SUPABASE_SERVICE_ROLE_KEY
```

## Verify
- [ ] `gh secret list` shows all 10 names.
- [ ] Open/push a trivial PR; the `E2E — Preview` job should resolve the preview
      within a poll or two and run the 7 Playwright tests
      (`smoke-recruiter-expiry` ×2, `fee-reconfirm` ×5).
- [ ] If the resolver still times out, the API call is the place to debug — add
      an HTTP-status / `.deployments | length` echo to the resolve step so a
      failure is legible instead of a silent 10-min loop. (Deferred improvement.)

## Coverage reminder
e2e here is thin (2 flows) and is **not** a security gate — the real gates are
`Lint + Typecheck + Build` and the vitest unit suite (`mandate-stages`,
`placements`, `job-fill`). e2e being red has never blocked a safe merge.
