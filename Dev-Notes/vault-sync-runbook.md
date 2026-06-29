# Vault sync runbook

How to keep the Obsidian vault (this repo root) in step with the Recruito code. Background:
[[Decisions/2026-06-29-vault-anti-drift-automation]].

## The three knowledge layers and how each stays current

| Layer | What it holds | Kept current by |
|---|---|---|
| `Decisions/` | ADRs (one per decision) | **You, as you decide** — CLAUDE.md §7 enforces it. Don't rely on recall. |
| `Architecture/` | `00–11` = original April build spec (frozen, historical). `As-Built/` = current state. | Update the matching `As-Built/NN-*.md` when an area changes materially. The `00–11` spec notes are history — don't rewrite them. |
| `Work-Log/` | Milestone summaries + auto `merge-log.md` | The opt-in post-merge hook appends merged commits; periodically fold notable lines into a dated milestone summary and trim `merge-log.md`. |
| `graphify-out/` | Code dependency graph | `/graphify . --update --obsidian --obsidian-dir .` — run when `graphify-out/.stale` exists or weekly. Needs the LLM (the skill), so it's a session step, not the hook. |

## Routine
- **As you decide:** write an ADR in `Decisions/`.
- **When an app area changes shape:** edit its `Architecture/As-Built/NN-*.md`.
- **On merge (if the hook is activated):** commits land in `Work-Log/merge-log.md` automatically; the
  dep-graph gets stale-flagged if `src/**` changed.
- **Weekly / on stale flag:** run `/graphify . --update --obsidian --obsidian-dir .`, then commit
  `graphify-out/` and remove `graphify-out/.stale`.

## Enable the auto-append hook (one-time, opt-in)
```sh
chmod +x .githooks/post-merge
git config core.hooksPath .githooks
```
Disable temporarily: `export RECRUITO_NO_VAULT_HOOK=1`. Undo: `git config --unset core.hooksPath`.
