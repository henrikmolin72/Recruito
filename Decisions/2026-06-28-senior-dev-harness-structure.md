# Senior-dev Claude Code harness structure

**Date:** 2026-06-28
**Status:** Accepted

## Context
Reviewed an external "set up Claude Code as a senior developer" guide (7 steps: focused CLAUDE.md + per-subdir files, hooks/agentic loops, on-demand skills, sub-agents, LSP, MCPs/plugins, guardrails) against our existing setup. We were already strong on skills, sub-agents, and MCPs. Real gaps: no nested CLAUDE.md, no `.claudeignore`, TS LSP not installed, and the error-iteration + reflection loops were not wired.

## Decision
Closed the gaps, splitting durable principle from repo specifics:
- **Global `~/.claude/CLAUDE.md`** — added a "Senior-dev harness standard" (the 7-point pre-build structure gate); applies to all projects.
- **Project `CLAUDE.md` §9** — repo-specific structure checklist + pointers.
- **Progressive disclosure** — focused `CLAUDE.md` added to `rekryteringsplattform/src/lib/actions/` (server-action auth/IDOR) and `rekryteringsplattform/supabase/migrations/` (GRANT + RLS rules), moving hot-path rules out of the root.
- **`.claudeignore`** at repo root — blocks node_modules / build / `.omc` state and, importantly, `.env` secrets.
- **TS LSP** — installed `typescript-language-server` globally; OMC `lsp_servers` now detects it.
- **Build-error hook** (`.claude/settings.json`, committed): `build-error-loop.py` — PostToolUse(Bash): nudges to fix a failed build/test/lint before proceeding.

Enforcement of the structure gate is a **documented checklist** (in CLAUDE.md), not another always-on hook — keeps the lean / token-minimal posture.

## Consequences
- Hot-path guidance loads only where relevant; root CLAUDE.md stays ≤300 lines.
- Failed builds get an explicit "don't proceed" signal.
- A reflection Stop hook (`reflect-on-stop.py`) was trialed and **removed the same day** — low yield for a token-minimal setup (it mostly produced "no durable learnings"). The error-loop hook stays.
- Existing `security-gate.py` / `i18n-gate.py` (in `settings.local.json`) are untouched and still run.
- Review the standard + hooks every few months as models evolve.
