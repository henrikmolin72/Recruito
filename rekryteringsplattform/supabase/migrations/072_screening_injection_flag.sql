-- Prompt-injection defense (2026-08-12): a screening whose CV tripped the
-- model-side INJECTION_CHECK marker or the deterministic .txt scan is flagged
-- for human review; run-evaluation.ts never auto-writes ai_match_score for a
-- flagged run. Existing service-role-only table — no Data-API GRANT needed
-- (CLAUDE.md §6 applies to NEW public tables).
alter table public.candidate_screenings
  add column if not exists injection_flagged boolean not null default false;
