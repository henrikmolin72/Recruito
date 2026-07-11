# Recruito Merge Log

Auto-appended by `.githooks/post-merge` on every merge. Fold the
notable lines into a dated milestone summary periodically, then trim.

## 2026-06-29
- bdf4eea chore(graph): refresh dep-graph (graphify update .)
- b24bdb4 fix(hooks): correct graphify CLI command (was silently no-op'ing)
- 384c086 chore(hooks): commit pre-commit + post-commit into .githooks/

## 2026-06-29
- d36e987 fix(candidates): enforce candidate cap on submission + correct admin counts

## 2026-07-01
- 49643c9 feat(recruiter): show ongoing-process stats on both job views, moved up

## 2026-07-01
- f3ee24c fix(recruiter): hide actively-claimed jobs from Browse regardless of status

## 2026-07-01
- 6c5f892 fix(candidates): pause + present-candidate gate on ACTIVE count, not total

## 2026-07-02
- ed235b9 test(candidates): pin 2026-07-02 client scenario — stray draft/withdrawn row no longer counts as In process
- 4dedd90 fix(recruiter): mandates-list Cap-reached gate = job-wide cap occupancy (was own raw rows incl. drafts)
- 6519030 fix(recruiter): mandate-detail cap gate counts job-wide occupancy, not own candidates
- 295840e fix(recruiter): Presented count = admin cap badge; drafts/withdrawn no longer inflate process stats
- 264ce55 feat(candidates): computeJobProcessStats — cap-parity stats for job process panel

## 2026-07-02
- 22333bb i18n(company): localize AI report title + decision-support disclaimer
- a65a660 feat(recruiter): AI screening runs automatically on CV upload and is always shown (was optional)
- bf3476d feat(company): show full AI screening report + decision-support disclaimer on candidate detail
- 4f3b163 feat(screening): company-authorized getCompanyCandidateScreening server action
- b98c494 fix(recruiter): show AI score+gaps summary on candidate detail, not the full report
- 5b02e3d feat(screening): recruiter-facing ScreeningSummaryCard (score + gaps only)
- 19d26a4 fix(screening): temperature 0 for deterministic AI match scores
- f2cc233 fix(review): task 2 quality findings
- 96d1b49 feat(screening): prompt emits canonical score line + caps score when a mandatory requirement is unmet
- 15966af feat(screening): deterministic match-score extraction via canonical FINAL_MATCH_SCORE marker

## 2026-07-03
- 5239057 feat(screening): show AI match as quality tiers, hide raw % from clients

## 2026-07-03
- d71606b feat(screening): treat missing critical requirements as deal-breakers

## 2026-07-06
- 08ebbb0 fix(recruiter): stop CV delete double-dialog + re-screen on re-upload

## 2026-07-06
- 2850b3f fix(company): Presented date = Recruito approval, not recruiter submission

## 2026-07-06
- d7d0a99 fix(recruiter): remove earnings from dashboard; In interview + Hired cards; active-mandate parity

## 2026-07-06
- cd9425f fix(recruiter): remove per-mandate candidates badge from dashboard mandate list

## 2026-07-06
- fccf4b6 fix(recruiter): dashboard perf card shows open jobs, drop guarantee bar + recent activity
- fccf4b6 fix(recruiter): dashboard perf card shows open jobs, drop guarantee bar + recent activity

## 2026-07-06
- 6ba7b4e fix(dashboards): guarantee result "—" when no guarantee completed (migration 063, NOT yet applied); admin analytics % double-scaling fix

## 2026-07-06
- 1cb82ae docs: merge-log + runbook entry for guarantee-result fix (migration 063 pending)
- 6ba7b4e fix(dashboards): guarantee result shows — when no guarantee completed; admin analytics % double-scaling

## 2026-07-06
- 4d1d383 fix(recruiter): refresh perf snapshot on read when stale (>1h/never) via service-role RPC; pre-063 guarantee guard; fixes "0 of 0 candidates" drift

## 2026-07-06
- 89944d4 Merge fix/ai-screening-before-submit → main
- ffa2cf6 fix(screening): run Recruito AI eval at submission (createCandidateExtended, non-blocking after()) so the admin Step-7 queue shows match score + full report before submit-to-client; approval-time run kept as idempotent fallback

## 2026-07-06
- e029b4f feat(candidates): show viewed eye icon on company candidates page

## 2026-07-06
- 6e7912a feat(screening): label match tiers as "CV Match" + box the AI assessment badge

## 2026-07-06
- dc4e8ed feat(auth): add "How did you hear about us?" dropdown to signup, replace company org-number field

## 2026-07-06
- 345678f feat(notifications): notify recruiter + admin on every company stage move

## 2026-07-06
- e826d2c feat(notifications): expand notification messages inline in the list

## 2026-07-06
- 95d951f fix(mandates): withdrawn candidate no longer suspends the 10-day expiry timer

## 2026-07-06
- eae4199 feat(company): Jobs list shows only active candidates count

## 2026-07-06
- 774257b fix(recruiter-reg): remove duplicate blurb, credit candidate's guarantee not client's

## 2026-07-06
- b3b8eae feat(company): opt-in €100 final-interview recruiter bonus + badge

## 2026-07-06
- 21bee88 feat(admin): clickable job titles open a review detail page

## 2026-07-06
- b6282e6 fix(company): show two language rows by default on new job post

## 2026-07-06
- ebfe66c feat(recruiter): show €100 Final Interview Bonus badge on Browse Jobs

## 2026-07-06
- 973c255 fix(recruiter): remove redundant bottom Take-Mandate box on job detail

## 2026-07-07
- 4f4d06d feat(recruiter): add Interview rate and Hire rate boxes to dashboard
- ad6c553 fix(company): move AI report behind View AI Report button on candidate view

## 2026-07-08
- 5a5f1b7 fix(migrations): make fresh-DB bootstrap idempotent for 014/022
- 914da44 feat(guarantee): admin Guarantee Completed/Failed workflow + recruiter dashboard sync
- f643e5d refactor(company): candidate view rebuild (Kanban → filter-tab list)
- 6dc0fba fix(company): exclude failed placements from placement counts
- 6ece46a fix(candidates): log every stage transition to candidate_stage_history
- d51c619 feat(placements): log guarantee-lifecycle moves to candidate timeline

## 2026-07-08 (cont.)
- 7c184e5 fix(db): capture prod-only candidates.company_stage columns in migration 066
- fbbcd55 fix(ui): suppress hydration warnings on locale-formatted timestamps
- 1166f50 feat(company): add Active Candidates stat + real Recent activity feed
- eb21ab8 fix(hooks): stop pre-commit typecheck failing on half-written .next/dev types
- 93536f2 fix(admin): job detail 404 — select referenced non-existent companies.linkedin_url
- 19f6596 chore(ui): drop dead LinkedIn branch from JobPreviewCard

## 2026-07-09
- 61dfa0d feat(guarantee): start guarantee at client-confirmed joining date (migration 067)

## 2026-07-10
- a72a7c1 chore(guarantee): ponytail cleanup — dedupe dashboard loader, drop dead code
- 8e94815 fix(ui): client-reported fixes from annotated screenshots (images 1-7, 15-17)

## 2026-07-11
- 2832f61 feat(screening): dedicated client-facing AI report — separate prompt replaces masking (migration 068)
- 1c1450e fix(ui): client-reported fixes — guarantee bars, mandate stats heading, rejection reasons, payout copy
- de0c1e0 chore(screening): ponytail shrink — dedupe response-text extraction into textOf()
- 9e94aca feat(screening): per-candidate AI presentation replaces batch Top-5 shortlist
- 98f0fec chore(repo): stop tracking machine state — OMC replays/sessions, graphify cache, traces
