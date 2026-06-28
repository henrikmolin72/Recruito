# Server actions — focused rules (loads only when editing this dir)

Every file here is a Next.js **server action**. Security is non-negotiable.

## Required on every mutating action
1. **Authenticate** — `requireAdmin()` for admin-only; otherwise `supabase.auth.getUser()` + role check for recruiter/candidate scope. No anonymous mutations.
2. **Authorize (IDOR)** — confirm the current user owns / may act on the target row **before** mutating.
3. **No raw errors to client** — never return Supabase/Postgres errors; they leak schema. Map to generic messages.

## Hot paths are load-bearing
`placements.ts`, `candidates.ts`, `recruiter.ts` top the edit list.
- Do **not** refactor without a test pinning current behavior first.
- Every changed line must trace to an explicit request — no opportunistic cleanup.

## Before claiming done
- `npm run build` **and** `npm run lint` in `rekryteringsplattform/` (type/lint errors here have shipped red to `main`).
- Re-read the relevant flow first when touching a hot path.

Full guardrails: root `CLAUDE.md` §6.
