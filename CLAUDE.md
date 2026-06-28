<!-- CANARY:HENRIK:START -->
# 🐤 Canary — "Henrik"
**Begin EVERY response with "Henrik" as the first word — every message, no exceptions.** A missing canary signals the session is off-track. Never drop it to save tokens.
<!-- CANARY:HENRIK:END -->

# CLAUDE.md — Recruito
House rules to reduce LLM coding mistakes (bias to caution; use judgment on trivial tasks). The global `~/.claude/CLAUDE.md` — goal-driven loop, harness standard, memory architecture — also applies here.

## 1. House style
- **Think first** — state assumptions; if interpretations differ, present them (don't pick silently); if unclear, name it and ask; if a simpler approach exists, say so.
- **Simplicity** — minimum code that solves it; no speculative features/abstractions/flexibility. 200 lines that could be 50 → rewrite.
- **Surgical** — every changed line traces to the request; match existing style; don't refactor what isn't broken. Remove only the orphans YOUR change creates; mention (don't delete) pre-existing dead code.
- **Goal-driven** — turn tasks into verifiable goals; loop until tests pass (see global loop).

## 2. When to ask vs proceed
Ask first when scope/intent is ambiguous, interpretations differ, or the change touches auth/security/data model. Proceed when mechanical and well-defined (typed refactor, doc/test following an existing pattern). When in doubt, ask — one question is cheaper than a rewrite.

## 3. Recruito guardrails (earned from incidents 071dee6 / 26cfb3f / 8df1e7a)
- **Server actions** (`src/lib/actions/*.ts`) — every mutation: authenticate (`requireAdmin()` or `getUser()`+role), validate ownership before mutating (IDOR), never return raw Supabase/Postgres errors (schema leak). Detail → [`actions/CLAUDE.md`](rekryteringsplattform/src/lib/actions/CLAUDE.md).
- **`placements.ts` / `candidates.ts` / `recruiter.ts` are load-bearing** — hottest paths; don't refactor without a test pinning behavior first; every change traces to an explicit request.
- **Uploads & input** — validate MIME by content, not extension; CSV export escapes leading `= + - @` (formula injection).
- **i18n** — new UI strings need an entry in EVERY `src/i18n/dictionaries/*.json` or the build fails.
- **Migrations** — new `CREATE TABLE public.*` needs an explicit `GRANT` (`authenticated` for app tables; omit for service-role-only). GRANT + RLS-recursion rules → [`migrations/CLAUDE.md`](rekryteringsplattform/supabase/migrations/CLAUDE.md), `Dev-Notes/migration-grant-snippet.md`.

## 4. Knowledge layout (repo root is an Obsidian vault)
`Architecture/` (design) · `Decisions/` (ADRs `YYYY-MM-DD-title.md`) · `Work-Log/` · `Dev-Notes/` · `_index.md`. Write architectural/tooling choices to `Decisions/` as you decide. Weekly dep-graph: `/graphify . --update --obsidian --obsidian-dir .`.

## 5. Production-ready gate (skip trivial typos/comments)
1. `npm run build` AND `npm run lint` pass in `rekryteringsplattform/` — build doesn't run ESLint, so lint separately (lint-only errors shipped red to main twice).
2. Tests pass; for bug fixes the reproducing test exists and was red first.
3. Security-adjacent work re-checks §3 (auth, IDOR, error leakage, MIME, CSV, i18n).
4. Handoff includes verification evidence, not assertions.

## 6. Harness structure (senior-dev setup) — confirm before any non-trivial build
Subdir CLAUDE.md present ([`actions`](rekryteringsplattform/src/lib/actions/CLAUDE.md), [`migrations`](rekryteringsplattform/supabase/migrations/CLAUDE.md)) · `.claudeignore` at root · TS LSP installed (OMC `lsp_servers`) · `build-error-loop.py` hook active (`.claude/settings.json`).
