# 2026-06-29 — Vault anti-drift automation (opt-in post-merge hook)

## Context
Audit on 2026-06-29 found the Obsidian vault had drifted ~2 months behind the code: the
`Architecture/` notes are the original April build spec (frozen at migration 004 while the DB is
at 061), `Work-Log/` had ~1 real entry for 60+ migrations, and `graphify-out/` was 5 days stale
covering 67% of files. The only knowledge layer reliably kept current is `Decisions/` — because
CLAUDE.md enforces writing an ADR as we decide. Everything else relied on memory and drifted.

Goal: stop future drift without adding heavyweight tooling (the user strongly prefers lean,
token-minimal setups — see auto-memory `feedback_token_minimal`, `tooling_cleanup`).

## Decision
A native, committed, **opt-in** git `post-merge` hook at `.githooks/post-merge`:
- Appends the newly-merged commits to `Work-Log/merge-log.md` (pure shell, no LLM, no deps).
- Flags the dep-graph stale (`graphify-out/.stale`) when `rekryteringsplattform/src/**` changed,
  printing the exact refresh command.
- Never blocks a merge, never touches code. Kill switch: `RECRUITO_NO_VAULT_HOOK=1`.
- Skips the throwaway worktrees under `.claude/`.

**Why a git hook and not husky / a plugin / a cron agent:** husky is a new dependency; a scheduled
cloud agent costs per run and is overkill for a solo repo. A `core.hooksPath` hook is dependency-free,
native, and committed so it travels with the repo.

**Why the dep-graph is only *flagged*, not auto-refreshed:** the semantic graph needs the LLM (the
`/graphify` skill orchestrates its own extraction subagents); a plain shell hook cannot run it. So the
hook surfaces a stale flag and the human (or a session) runs `/graphify . --update --obsidian
--obsidian-dir .`. The `merge-log.md` append, which needs no LLM, *is* fully automated.

## Activation (not auto-enabled)
Pointing `core.hooksPath` at the repo's hooks is a persistence change, so it is left to an explicit,
one-time opt-in rather than wired on install:

```sh
chmod +x .githooks/post-merge
git config core.hooksPath .githooks      # repo-local; undo with: git config --unset core.hooksPath
```

Until activated, the hook file is inert. See [[Dev-Notes/vault-sync-runbook]] for the full sync routine.

## Status
Hook file committed; **activation pending user approval** (the sandbox correctly flagged auto-wiring
`core.hooksPath` as unrequested persistence). Work-Log backfill, as-built notes, and a fresh dep-graph
were produced in the same 2026-06-29 sync. Related: [[Decisions/2026-06-28-admin-revenue-source-of-truth]].
