# Client-facing AI screening report: separate prompt, not masking

**Date:** 2026-07-11
**Status:** Decided, implemented (migration 068 + second model call in run-evaluation)

## Context

The company ("client") view of the AI screening report was the internal
recruiter/admin report with every percentage regex-masked to "—"
(`stripClientVisibleScores`). Client complaint 2026-07-11 (annotated
screenshots, images 5–7): broken sentences ("Direct Match Score is — meets
the threshold"), a dangling "Human Review Recommended: NO" flag, and the
Section E table collapsing into a pipe-character paragraph after masked
rows were dropped.

## Decision

Generate a **separate client-facing report with its own prompt** at
evaluation time (second `messages.create` in `run-evaluation.ts`, prompt in
`src/lib/screening/client-report-prompt.ts`). It rewrites the internal
report qualitatively — no scores, no internal machinery — into a fixed
6-section structure (Overview / Key Strengths / Areas to Explore in an
Interview / Experience / Education / Our Assessment). Stored as
`candidate_screenings.client_report_markdown` (migration 068).

- `getCompanyCandidateScreening` serves `client_report_markdown` when
  present; legacy rows fall back to the masked internal report.
- `stripClientVisibleScores` stays applied to BOTH as the hard
  no-raw-percentages backstop (no-op on a compliant client report).
- The flag line `Human Review Recommended: …` is now also dropped by the
  strip (helps the legacy fallback); the `| Overall Recommendation |
  HUMAN REVIEW |` value still survives (2026-07-10 decision).
- Client-report generation failure never sinks the evaluation → column
  stays NULL → fallback.

## Alternatives rejected

- **Keep masking, patch the regexes** — unwinnable against free-text LLM
  prose; every fix produced a new broken rendering.
- **Generate on first company view** — 10–30 s page load + a write in a
  read path.
- **Gate the second call on admin runs (`setScore`)** — saves recruiter
  self-check tokens but risks a client-visible candidate without a client
  report; eager generation is simpler.

## Deploy order (hard gate)

Migration 068 must be applied to prod BEFORE this code deploys: the new
column is both inserted and selected; without it, screenings stop
persisting and every company AI report 404s (returns null).

## Accepted residual risk

The internal report (derived from an untrusted CV) is fed verbatim into
the second prompt. Numeric leakage is backstopped by the strip; a model
slip on machinery *words* is prompt-enforced only (reviewed 2026-07-11,
accepted).
