# Screening & AI Evaluation — As-Built (2026-06-29, migrations through 061)
> Current-state companion to the original build spec [[Architecture/06-JOB-SYSTEM]]. The spec is the frozen April plan; this note is what the code actually does now. See also [[Architecture/As-Built/05-CANDIDATES-WORKFLOW]] for the surrounding candidate lifecycle.

## What it does today
A structured, compliance-aware AI screening of one candidate's CV against the role JD. The same filled prompt and the same core engine (`runCandidateEvaluation`) drive three entry points, distinguished only by who runs it and whether the company-visible score is written:

- **Recruiter pre-submission self-check** — `screenDraftCandidate` (server action). Persists the in-progress candidate as a `draft` row (incl. uploaded CV) so the engine can read it, runs the eval, and returns `matchScore` + a few `criticalGaps` for an inline preview. `setScore: false` — a recruiter run NEVER writes the company-visible `candidates.ai_match_score`. The draft is ephemeral (promoted to a real row on Present), so this report is a self-check, not the candidate's official screening.
- **On-demand report** — `POST /api/screening-report`. Recruiter or admin runs the full report for an existing candidate. Recruiter run = self-check (`setScore: isAdmin`, i.e. false for recruiters); admin (Recruito) run sets the score.
- **Auto-run on Recruito approval** — `markCandidateRecruitoScreened` (admin action). When Recruito approves a candidate for the client, it fires the eval in a non-blocking `after()` callback with `setScore: true`. The approval returns immediately; the company-visible match score lands a few seconds later. Best-effort: a missing CV or a DOCX (engine handles PDF/TXT only) just yields no score and never blocks approval.

Engine flow (`runCandidateEvaluation`): gather JD + per-mandate eval config + candidate CV path + screening Q&A → download CV from the `cvs` storage bucket (PDF or TXT only; >5MB rejected; SHA-256 hashed) → fill the prompt template → one Anthropic `messages.create` call (CV sent as a `document` block, default model `claude-sonnet-4-6`, `max_tokens: 8000`, `temperature: 0.1`) → store the markdown report in `candidate_screenings` → extract a 0-100 match score and critical gaps from the markdown.

Score-write guards (the load-bearing part): `ai_match_score` is written only when `setScore` is true AND a score parsed AND the report row actually persisted, and only `.is("ai_match_score", null)` — a re-run never clobbers an existing score, and a client-facing score is never exposed without its backing report. A failed report insert yields no score rather than data drift; the live report is still returned from the function so a missing row only costs persisted re-views.

Per-mandate scoring config (target sector, accepted adjacent sectors, transferable skills to credit, custom keywords) is set once per mandate via `saveMandateEvalConfig` / read via `getMandateEvalConfig`, and feeds the prompt's ROLE CONTEXT.

### Shortlist Generator (separate feature, different table)
A distinct, client-facing AI feature that ranks a job's already-screened candidates and writes the pitch/share copy a recruiter sends to the client. `POST /api/generate-shortlist` (body: `{ jobId }`) reads the legacy `ai_screenings` table — NOT `candidate_screenings` — pulling `status: "completed"` rows ordered by `match_score`, scoping to the caller's own `recruiter_id` (admins see all), taking the top 10, then asking Anthropic (default `claude-sonnet-4-6`, `max_tokens: 1400`, `temperature: 0.2`, prompt-caching on the JD block) to return JSON of the best 5 with a per-candidate `pitch` plus a ready-to-send `shareText`. Output is Zod-validated (1–10 items, score 0–100, ranks sorted, sliced to 5). Auth: recruiter-or-admin; non-admin must own an `is_active` mandate on the job. Its own rate limit — **8 / 10 min** per user (`api:shortlist:user:<id>`), separate from the screening route's 15/10min. UI is `ShortlistGenerator` (`src/components/screening/shortlist-generator.tsx`), a recruiter button + Radix dialog mounted on the recruiter mandate detail page (`recruiter/mandates/[id]/page.tsx`, rendered only when the mandate has a `jobId`); it shows ranked cards and a copy-to-clipboard share text. This is the one live caller of `ai_screenings` (see 027/028 note below).

Compliance posture is baked into the prompt template, not enforced in code: score competencies not titles; Direct + Adjusted match scores for adjacent-sector candidates; ignore protected attributes; flag possible indirect discrimination; English output. Audit trail = the stored `candidate_screenings` row (screening id, model version, CV hash, timestamp).

Auth/IDOR: `authorizeMandate` requires recruiter-or-admin role + mandate ownership; `gatherEvalData` re-checks the candidate belongs to the mandate's job. `getLatestEvaluation` adds its own ownership check (non-admin caller must own the candidate) and scopes the report by `candidate_id`. Anthropic cost is rate-limited per user (15 / 10 min, shared key `api:screening-report:user:<id>` across the route and the draft self-check). Errors are masked to safe codes (`no_cv`, `unsupported_cv_format`, `screening_failed`) before reaching the client, per CLAUDE.md §6.

## Key files
- `rekryteringsplattform/src/lib/screening/run-evaluation.ts` — core engine; the score-write guard hot path.
- `rekryteringsplattform/src/lib/screening/eval-data.ts` — `authorizeMandate` (role + mandate-ownership IDOR) and `gatherEvalData` (JD + config + CV path + Q&A).
- `rekryteringsplattform/src/lib/screening/evaluation-prompt.ts` — the verbatim client prompt template + `fillEvaluationPrompt` / `assembleClipboardPayload`; defines `EvalConfig`.
- `rekryteringsplattform/src/lib/screening/extract-match-score.ts` — parses 0-100 from the report (prefers "Adjusted Match Score", last occurrence; falls back to "Direct Match Score").
- `rekryteringsplattform/src/lib/screening/extract-critical-gaps.ts` — best-effort heuristic pulling up to 4 gaps from the "KEY GAPS" block (bullets → table rows → prose).
- `rekryteringsplattform/src/lib/actions/screening.ts` — mandate eval-config CRUD; Phase-1 copy-to-clipboard prompt (`buildEvaluationPrompt`); `getLatestEvaluation`.
- `rekryteringsplattform/src/app/api/screening-report/route.ts` — on-demand report endpoint (`runtime: nodejs`, `maxDuration: 120`).
- `rekryteringsplattform/src/lib/actions/candidates-extended.ts` — `screenDraftCandidate` (recruiter draft self-check, `setScore: false`).
- `rekryteringsplattform/src/lib/actions/candidates.ts` — `markCandidateRecruitoScreened` (auto-run on approval via `after()`, `setScore: true`).
- `rekryteringsplattform/src/app/api/generate-shortlist/route.ts` — Shortlist Generator endpoint (`runtime: nodejs`); reads `ai_screenings`, ranks top candidates, rate limit 8/10min.
- `rekryteringsplattform/src/components/screening/shortlist-generator.tsx` — recruiter shortlist UI; mounted in `src/app/(dashboard)/recruiter/mandates/[id]/page.tsx`.
- Tests: `eval-data.test.ts`, `extract-match-score.test.ts`, `extract-critical-gaps.test.ts`, `run-evaluation.test.ts` (all under `src/lib/screening/`).

## Data model / migrations
- **046 `mandate_eval_config.sql`** — adds `eval_target_sector text`, `eval_adjacent_sectors text[]`, `eval_transferable_skills text[]`, `eval_custom_keywords text[]` to `job_mandates`. Per-mandate (not per-job) because the recruiter owns the mandate and cv-match already keys on `mandate_id`; one job can carry multiple mandates each with its own lens. ALTER on existing table — no new GRANT.
- **047 `candidate_screenings.sql`** — stored AI reports: `screening_id`, `candidate_id` (FK, ON DELETE CASCADE), `mandate_id`, `job_id`, `recruiter_user_id`, `report_markdown`, `model_version`, `cv_hash`, `created_at`. Index on `(candidate_id, mandate_id, created_at DESC)` for latest-report lookup. **Service-role-only**: RLS enabled, no policies, GRANT deliberately omitted per CLAUDE.md §6 — only `createAdminClient()` touches it.
- `candidates.ai_match_score` — the company-visible score the engine writes; lives on the `candidates` table (predates this area, written here under the guards above).
- **027 `ai_compliance.sql`** and **028 `skills_taxonomy.sql`** are an EARLIER, separate AI-screening lineage: `ai_screenings` (extended with `model_version`/`prompt_hash`/`human_reviewer_id`/`is_decision_support`), `ai_audit_log`, `ai_bias_reports`, plus `skills` / `candidate_skills` / `job_required_skills` / `talent_pool_entries`. None of these tables are referenced by the current `src/lib/screening/` engine — the live screening path uses `job_mandates` eval columns + `candidate_screenings` only. The one live caller of this lineage is the Shortlist Generator (`/api/generate-shortlist`), which reads `ai_screenings` (`status`/`match_score`/`analysis_json`) for ranking input; nothing in the current code writes these tables. Treat 027/028 as a separate, read-only-for-shortlist lineage from the main screening engine.

## Notable changes since the original plan
- Screening is a **per-mandate, recruiter-driven CV-vs-JD evaluation**, not the application-centric `ai_screenings` + bias-reporting pipeline implied by the 027/028 schema. The live engine never writes `ai_screenings`, `ai_audit_log`, or `candidate_skills`; the audit trail is the `candidate_screenings` row.
- **Two-phase rollout collapsed into one engine.** Phase 1 (copy-prompt-to-clipboard for an external AI tool, `buildEvaluationPrompt`) still exists, but the same filled prompt now also feeds a server-side Anthropic call (`runCandidateEvaluation`), reused by all three entry points.
- **Score ownership is explicit.** Only a Recruito (admin) run writes `ai_match_score`; recruiter self-checks produce + store a report but never set the client-facing score. Enforced by the `setScore` flag plus the persisted-and-null-only write guard.
- **Auto-run on approval** wires screening into the candidate lifecycle: approval triggers a non-blocking eval so the company sees a score without a manual step.
- Parsing the score/gaps out of free-form markdown is a **deliberate heuristic** (last-occurrence regex for the score; multi-pass bullet/table/prose scan for gaps), with documented `ponytail:` ceilings — drift degrades to "score only" / "no score", never a crash.

## Related decisions & notes
- [[Decisions/2026-06-22-legacy-candidate-empty-state]] — references the legacy candidate/screening surface.
- [[Dev-Notes/deployment-runbook]] — deployment steps touching the screening path.
- Cross-area: [[Architecture/As-Built/05-CANDIDATES-WORKFLOW]] (candidate lifecycle), [[Architecture/As-Built/04-JOB-SYSTEM]] (mandates/jobs the config hangs off).
- Project guardrails: CLAUDE.md §6 (server-action auth, IDOR, error masking, service-role-only tables).
