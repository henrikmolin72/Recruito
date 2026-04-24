# 2026-04-22 — Tooling cleanup: token & memory simplification

**Context:** Claude Code setup had 4 overlapping memory systems, 5 code-review implementations, 3 feature-dev workflows, and a 2s-per-Read hook from claude-mem causing token/latency bleed. Obsidian vault existed but was empty while 13 architecture docs lived in a loose `files/` folder.

**Decision:**

1. **Removed plugins** (disabled in `~/.claude/settings.json`):
   - `coderabbit@claude-plugins-official` — ghost reference, not on disk
   - `claude-mem@thedotmack` — 2s per-Read hook, duplicate memory layer
   - `feature-dev@claude-plugins-official` — duplicated by OMC autopilot/ralplan

2. **Memory architecture** — three layers, one purpose each:
   - **Auto-memory** (`~/.claude/projects/…/memory/`) — durable facts about user, project, feedback. File-based, native, zero hook overhead.
   - **OMC** (`.omc/`) — session state, hot paths, notepad. Only active during tasks.
   - **Obsidian vault** (this folder) — human-readable knowledge, decisions, architecture. Fed by graphify weekly.

3. **File structure** — Recruito root is the Obsidian vault. `files/*.md` moved to `Architecture/`. New top-level: `Architecture/`, `Decisions/`, `Work-Log/`, `Dev-Notes/`, `_index.md`.

4. **Kept plugins:** claude-code-setup, claude-md-management, frontend-design, code-simplifier, github, railway, security-guidance, code-review, supabase, vercel, oh-my-claudecode, superpowers.

**Alternatives rejected:**

- *Keep claude-mem, kill OMC memory* — OMC is already orchestrating agents and has tighter hook integration; claude-mem's SQLite worker is heavier for marginal gain.
- *Keep feature-dev* — OMC's autopilot+executor+ralplan is more integrated with the rest of the OMC agent catalog.
- *Separate vault outside project* — vault and code coexist fine; keeping them together means `/graphify . --obsidian --obsidian-dir .` just works.

**Consequences:**

- Every session start is lighter (no claude-mem worker boot, no Read hook delay).
- Single source of truth for written knowledge: Obsidian vault.
- Weekly graphify refresh keeps dep graph navigable.
- Backup at `~/.claude/settings.json.bak-*` if rollback needed.

**To verify after restart:**
- `/plugin` should no longer show coderabbit/claude-mem/feature-dev as enabled.
- No worker on `localhost:37777` after next session.
