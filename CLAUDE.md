<!-- CANARY:HENRIK:START -->
# 🐤 Canary — "Henrik"
**Begin EVERY response with "Henrik" as the first word — every single message, no exceptions: task acknowledgments, task execution, casual back-and-forth, clarifying questions, all of it.** The name is a canary: any response that does NOT start with "Henrik" signals the session is off-track or context has degraded, so Henrik can spot it immediately and hit the brakes before work drifts. Never drop the canary to save tokens.
<!-- CANARY:HENRIK:END -->

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 5. When to Ask vs. Proceed Autonomously

Karpathy §1 ("stop and ask when unclear") interacts with OMC's autonomous delegation. Reconcile:

- **Ask first** when: scope/intent is ambiguous, multiple reasonable interpretations exist, the change touches auth/security/data model, or the user's goal isn't obvious from the request.
- **Proceed autonomously** when: the target is mechanical and well-defined (rename, typed refactor with clear boundaries, verification passes, doc/test updates following an existing pattern).
- **When in doubt, ask.** One clarifying question is cheaper than a rewrite.

## 6. Recruito-Specific Guardrails

Earned from recent incidents (see commits `071dee6`, `26cfb3f`, `8df1e7a`).

**Server actions (`src/lib/actions/*.ts`)**
- Every mutating action must authenticate. Use `requireAdmin()` for admin-only; check `supabase.auth.getUser()` + role for recruiter/candidate scope.
- Never return raw Supabase/Postgres errors to the client — they leak schema. Map to generic messages.
- Validate ownership before mutation (IDOR prevention): confirm the current user owns or is authorized for the row being modified.

**`placements.ts` is load-bearing**
- Hot path (14x recent edits). Do not refactor without a test that pins current behavior first.
- Changes here must trace to an explicit request — no opportunistic cleanup.

**Uploads & user input**
- Validate MIME by content, not just extension.
- CSV export: escape leading `=`, `+`, `-`, `@` to prevent formula injection.

**i18n keys**
- New UI strings require entries in every dictionary under `src/i18n/dictionaries/`. Build fails otherwise (see `8df1e7a`).

**Before claiming done on server-action or security-adjacent work**
- Run `npm run build` in `rekryteringsplattform/`. Type errors here have shipped twice.

**New `CREATE TABLE public.*` migrations need explicit `GRANT`**
- From Oct 30, 2026 Supabase will stop auto-exposing new `public` tables to the Data API. Adding the grant earlier is harmless and avoids a flag-day cliff.
- For app-facing tables: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<name> TO authenticated;` (add `anon` only if truly public).
- For service-role-only tables (audit logs, admin internals): omit the grant — `createAdminClient()` still works.
- See [Dev-Notes/migration-grant-snippet.md](Dev-Notes/migration-grant-snippet.md) and [Decisions/2026-05-27-supabase-public-grant-default.md](Decisions/2026-05-27-supabase-public-grant-default.md).

## 7. Knowledge layout

This repo root is an Obsidian vault. Canonical locations:
- `Architecture/` — system design (was `files/`, migrated 2026-04-22)
- `Decisions/` — ADRs, one per decision, dated `YYYY-MM-DD-title.md`
- `Work-Log/` — weekly/milestone summaries
- `Dev-Notes/` — runbooks, hot-path docs, gotchas
- `_index.md` — vault entry point

When making an architectural or tooling choice, write it to `Decisions/` as you decide — do not rely on conversation recall.

Refresh the dep graph into the vault weekly: `/graphify . --update --obsidian --obsidian-dir .`

## 8. Production-ready gate

Before claiming a coding task done:
1. `npm run build` passes in `rekryteringsplattform/`.
2. Tests pass; for bug fixes, the reproducing test exists and was red before the fix.
3. Security-adjacent work checks §6 (auth, IDOR, error leakage, MIME, CSV injection, i18n).
4. Handoff includes verification evidence, not assertions.

Trivial edits (typos, comments) skip the gate.

