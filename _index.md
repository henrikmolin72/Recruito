# Recruito Vault Index

Entry point for all project knowledge. This is an Obsidian vault — every markdown file here is linkable.

## Folders

- **[[Architecture/00-MASTER-PLAN|Architecture]]** — system design, schema, portals, jobs, payments
- **[[Decisions/README|Decisions]]** — architectural and tooling decisions, with rationale
- **[[Work-Log/README|Work-Log]]** — weekly/milestone summaries of work done
- **[[Dev-Notes/README|Dev-Notes]]** — ad-hoc notes, runbooks, hot-path documentation

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
