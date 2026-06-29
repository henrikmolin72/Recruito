# Recruito Vault Index

Entry point for all project knowledge. This is an Obsidian vault — every markdown file here is linkable.

## Folders

- **Architecture** — two layers:
  - [[Architecture/00-MASTER-PLAN|Original build spec (00–11)]] — the frozen April plan (migration-004 era), kept as history.
  - [[Architecture/As-Built/_index|As-Built (current state)]] — what the code actually does now (migrations → 061), code-grounded + verified. **Start here for current architecture.**
- **[[Decisions/README|Decisions]]** — architectural and tooling decisions, with rationale
- **Work-Log** — [[Work-Log/2026-H1-milestone-log|2026 H1 milestone log]] (build → 2026-06); `merge-log.md` is auto-appended on merge
- **[[Dev-Notes/README|Dev-Notes]]** — runbooks & hot-path docs, incl. [[Dev-Notes/vault-sync-runbook|vault sync runbook]]

## External persistence (not in vault)

| System | Location | Role |
|---|---|---|
| Auto-memory | `~/.claude/projects/…/memory/` | Durable user/project/feedback facts Claude uses across sessions |
| OMC project-memory | `.omc/project-memory.json` | Hot paths, tech stack, build commands |
| Graphify | `graphify-out/` | Code dependency graph; regenerated via `/graphify . --obsidian --obsidian-dir .` |

## Conventions

- Write decisions in `Decisions/` as they happen — don't rely on memory recall.
- Weekly: run `/graphify . --update --obsidian --obsidian-dir .` to refresh the dep graph into the vault.
- Use `[[wiki-links]]` so Obsidian graph view stays rich.
