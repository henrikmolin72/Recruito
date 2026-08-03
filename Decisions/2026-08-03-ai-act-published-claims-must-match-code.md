# Published AI claims must be provable from the code

**Date:** 2026-08-03
**Status:** Accepted
**Context:** EU AI Act (Regulation 2024/1689) high-risk obligations became enforceable for Annex III employment systems on **2 August 2026** — the day before this decision.

## Context

An audit of the AI screening feature against the Act found that Recruito had built the
*presentation* of compliance without the mechanics behind it. Three published statements
were contradicted by the code:

1. The AI policy page listed photograph, date of birth, gender and salary history as things
   "the AI does NOT see". The live evaluation path
   ([run-evaluation.ts](../rekryteringsplattform/src/lib/screening/run-evaluation.ts)) sends
   the **entire CV PDF base64-encoded** to Anthropic. Everything in that file reaches the model.
2. The policy promised a full Art. 12 audit trail. `ai_audit_log` was only written by
   `/api/screen` — the legacy `ai_screenings` path. The live path (`candidate_screenings`)
   wrote nothing.
3. The policy promised bias monitoring with a >20% deviation flag. Nothing in the codebase
   ever wrote to `ai_bias_reports`, so `/api/compliance/bias-report` returned 404 on every job.

Candidates — the people Art. 26(7) and Art. 86 disclosure exists for — were never told AI was
used at all. Both AI policy pages were behind auth.

## Decision

**A compliance claim ships only when the code proves it.** Concretely:

- Any statement on a policy page about what data leaves the system must be verifiable by
  reading the request-building code. Where we cannot technically guarantee something, we say
  so plainly rather than claiming the stronger version. Prompt instructions are described as
  instructions, never as guarantees.
- Audit and monitoring claims must point at a mechanism that runs on the **live** path. When a
  path is superseded, its compliance writes move with it.
- Candidate-facing disclosure lives on a **public**, unauthenticated page and is shown before
  submission, not inside a consent checkbox.
- Derived compliance reporting is computed on read where the inputs are cheap. Snapshot tables
  fed by crons are a standing drift risk — `ai_bias_reports` sat empty for months without
  anyone noticing, precisely because nothing failed loudly.

## Consequences

- `ai_bias_reports` (migration 027) is now unused. Left in place, not dropped: reinstate it
  only if a regulator needs point-in-time history rather than current state.
- Bias flags use experience band and location as **proxies**. We do not collect gender, age or
  ethnicity, so we cannot audit outcomes against protected characteristics directly. The policy
  page states this limitation rather than implying a demographic audit.
- The recruiter declaration now includes an attestation that the candidate was told about AI
  screening — the recruiter-submitted intake path has no form to show the candidate.

## Open — not resolved by this decision

**Are we a provider or only a deployer?** We build the screening system and supply it under our
own name to client companies, which points at **provider** obligations (Art. 16–21: conformity
assessment, EU declaration of conformity, CE marking, registration, quality management system,
post-market monitoring) — materially heavier than the deployer duties most staffing-sector
commentary describes. The Art. 6(3) exemption is unavailable either way: we score and rank
candidates on personal data, which is profiling under GDPR Art. 4(4).

Also outstanding and off-repo: DPIA, Anthropic DPA + zero-data-retention confirmation, Art. 11
technical documentation, Art. 26(6) six-month log retention policy, and a staffed
`compliance@recruito.se`.

These need legal input, not code. Until they are settled this decision covers only the narrower
rule: **do not publish a claim the code does not keep.**
