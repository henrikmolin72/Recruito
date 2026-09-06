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

## 2026-07-12
- 6ea3356 docs: implementation plan for client launch fixes
- 71d7525 docs(vault): ADR — launch scope full-time/annual only + request-changes loop
- 5c2c305 feat(admin): request-changes review loop (pending_approval->draft->resubmit) with notifications + badges
- 9a73822 fix(support): guard support-modal send with try/finally + localize error toast
- 3aa5d67 feat(support): in-app contact support form (auto-context + email via dispatch)
- 2e9c455 fix(ui): company job detail — remove duplicated title/company/location block in Description tab
- 6100ee8 fix(security): strip raw company join from recruiter marketplace payload (confidential leak)
- 5b4d273 fix(security): mask confidential company name in recruiter marketplace + hide website; owner sees Confidential pill
- 78afd09 feat(jobs): field-level validation feedback in job wizard (Next/Publish highlight + server field mapping)
- 616025c feat(jobs): salary period fixed to Annual; wizard fee chip reuses calculateClientFee
- c0c2bf6 feat(jobs): restrict employment type to full_time for launch (form + server validation)
- b060e39 fix(ui): guarantee 0 months displays as '0 months' instead of dash/hidden (5 sites)
- d363278 fix(admin): exclude drafts from admin jobs listing
- 457a519 fix(i18n): add status.pending_approval + pending_client_reconfirm labels (all 4 dicts)

## 2026-07-15
- 5632a12 feat(email): Resend bounce/complaint suppression webhook

## 2026-07-15
- 4d5f496 fix(email): send from recruitomatch.com; stop the coming-soon gate eating machine endpoints

## 2026-07-20
- a8e17e9 feat(recruiter): show AI screening score + gaps on submitted candidate detail
- 03f6c5e fix(screening): strip KEY_GAPS machine line from client fallback report
- 20ac419 feat(screening): structured KEY_GAPS marker replaces heuristic gap scraping
- 7c77a73 fix(screening): never surface criterion titles as recruiter gap chips

## 2026-07-20
- cd80a9b fix(auth): dev server now enforces route guards; sidebar never shows a fake identity

## 2026-07-20
- b3fc817 fix(dashboard): greet without a name instead of 'Välkommen tillbaka, undefined'

## 2026-07-27
- 5d73c5d fix(recruiter): invalidate in-flight duplicate check when email is edited
- 5386526 docs(plan): addendum — review-found blocking-scope fix (9b15bbd)
- 9b15bbd fix(recruiter): hard-block only same-job duplicates; warn on advisory matches
- 683d74e feat(recruiter): block Present while duplicate flag is active
- 5b78b8c feat(recruiter): auto-flag duplicate candidates on email/LinkedIn blur
- 15e53a5 test(candidates): pin cross-recruiter same-job duplicate block
- cd88b63 docs(plan): duplicate-flagging auto-check implementation plan

## 2026-08-03
- 3ad56b0 fix(compliance): make published EU AI Act claims true in code

## 2026-08-12
- b139be2 test(screening): adversarial integration test — real functions vs crafted malicious CVs
- 7e0c828 harden(screening): INJECTION_CHECK marker tolerates a trailing reason
- 90d3736 docs(plan): CV prompt-injection defense implementation plan
- 91c0b2b docs(decisions): ADR + work-log for CV prompt-injection defense
- b64f726 feat(screening): surface injection flag to admin + recruiter (never company)
- f79151d feat(screening): report renderer strips links and images
- 074de98 feat(screening): injection flag blocks auto-score, persisted + audited
- 4f51016 feat(db): candidate_screenings.injection_flagged (migration 072)
- 118d0f8 feat(screening): client-report prompt treats inputs as data, not instructions
- f1c4566 feat(screening): declare CV untrusted in eval prompt + INJECTION_CHECK marker
- e605026 feat(screening): deterministic injection scan for .txt CVs
- d015fbc feat(screening): parse INJECTION_CHECK marker (last-match-wins)
- 9b0ecf2 fix(screening): FINAL_MATCH_SCORE parse is last-match-wins — an echoed injected marker can no longer set the score

## 2026-08-19
- 7f2b64d chore(lint): ignore transient supabase/.temp edge-runtime bundles
- 2358489 docs(decisions+plan): timestamps/guarantee-rate ADR, week-34 log, implementation plan
- 1cc5893 polish(dashboard): break-words on tile labels for long Nordic strings
- aeb002b polish(dashboard): wrap tile labels; honest null fallbacks; restore hire-rate note
- 0da0c29 feat(dashboard): recruiter overview merged into one card with equal tiles
- 94332d8 test(metrics): viewed case exercises first-open path; fix guard comment
- 00ae17d test(metrics): pin no-restamp guard with differential replay case
- 633acb6 harden(metrics): no-op moves keep timestamps; tighter backfill; fn search_path
- 82ebcb7 fix(metrics): guarantee rate counts refund_processing; refresh snapshots
- 5e9e26f fix(metrics): company hires stamp hired_at; backfill from stage history
- 788abf4 harden(form): timezone-safe interview-date bound + contact-method allowlist
- 3bab633 fix(form): interview date cannot be in the future
- f6bb609 fix(form): contact method limited to In Person and Video Call
- c25c449 fix(ui): rename Date of First Contact to Interview Date

## 2026-08-19
- 19f0185 fix(guarantee): hydration mismatch in GuaranteeTimer — pinned-locale date + UTC day math
- 33325ef chore(lint): ignore transient supabase/.temp edge-runtime bundles

## 2026-08-27
- 3ebf21c feat(pricing): multi-currency fees + exclusive rate, industry lock, hired congrats

## 2026-08-27
- c9447bb fix(admin): client fixes — invoice gating, figure-based recruiter fee, candidate tabs, hydration

## 2026-08-28
- 1820e4b feat(recruiter-reg): legal-eligibility confirmation + admin visibility

## 2026-08-28
- 5f81643 fix(security): close admin-role privilege escalation (C1+H1+H2)

## 2026-08-28
- 408f0e6 chore(security): sync lockfile to patched deps — npm audit 0 (H6)
- aa3790a chore(security): untrack env.local.rtf* and ignore them (H5)

## 2026-08-28
- 81d8355 fix(security): lock down SECURITY DEFINER RPCs + over-permissive RLS (H3/H4/M7/M1/M3/M4)

## 2026-08-28
- 90903e1 fix(security): protect company billing PII from non-owners (M2)
- 19509e7 fix(security): delete dead legacy /api/screen route + unused score card (M5)

## 2026-08-28
- 0ad1ed1 fix(security): low-severity hardening (L4/L7/L8/L9)

## 2026-08-28
- 77ad355 feat(dashboard): always show Active guarantees section with empty state

## 2026-08-29
- 3dcaac6 feat(pricing): guarantee-tiered recruiter fee 6/6.5/7% + round-to-10 + minimums

## 2026-08-30
- 423c29b fix(pricing): derive fee % columns from guarantee model, drop vestigial volume-tier

## 2026-08-30
- bb8bd4f feat(landing): add companies + recruiters positioning bands after hero

## 2026-09-02
- 8ab5d40 fix(recruiter): hydration error on Messages inbox date
- 29228fc feat(client): 8 fixes from 2026-08-31 client review (images 310726)

## 2026-09-04 — Client fixes bundle (6 images, branch feat/client-fixes-2026-09-04)

Subagent-driven execution of `docs/superpowers/plans/2026-09-04-client-fixes-sept4.md`. 5 feature commits on top of `8ab5d40`:

- `2754a50` fix(notif): drop client-only "45-day hiring timeline" sentence from the recruiter client-viewed notification (4 dicts).
- `4bd9c9f` feat(calculator): +/- salary stepper; `stepSalary` (snap-to-grid + clamp, TDD); ISK step 100k→10k.
- `d176256` feat(recruiter): salary-expectation note vs client max — pure `salaryExpectationLevel` (TDD, +10% boundary), amber ≤10% / red >10%, currency-matched, non-blocking; form currency defaults to job currency.
- `7a1c43c` feat(admin): admin job-detail 5 tabs (pipeline/description/recruiters/announcements/AI compliance); shared pure `collapseMandateRows` extracted so company + admin Recruiters tabs can't drift; `getAdminJobById` embeds + `getAdminJobAnnouncements`; announcements `readOnly`. Code-review APPROVED (opus).
- `9bc5e9f` feat(admin): recruiters/companies online counter + `/admin/presence` history; service-role-only `presence_sessions` (migration 080), pure `presence.ts` (TDD), 60s heartbeat in dashboard layout, admins never counted. Code-review APPROVED (opus). Decision note `Decisions/2026-09-04-presence-tracking.md`.

Gate: `npm run build` OK (both new routes registered), `npm run lint` 0 errors (3 pre-existing warnings), `npm test` 544 passing (526 baseline + 18 new). tsc clean.

STILL PENDING (Henrik): browser-verify on local stack; merge to main; apply migrations 078/079/080 to prod (in order); push (= Vercel prod deploy).

## 2026-09-04
- 6d22eb9 feat(admin): recruiters/companies online counter + /admin/presence history (migration 080)
- 7a1c43c feat(admin): job detail tabs (pipeline/description/recruiters/announcements/AI compliance)
- d176256 feat(recruiter): salary-expectation note vs client max (+10% allowed, above warns)
- 4bd9c9f feat(calculator): +/- salary stepper (10 000 for SEK/NOK/DKK/ISK)
- 2754a50 fix(notif): drop client-only 45-day sentence from recruiter client-viewed notification

## 2026-09-06
- 728e4c4 fix(client): calculator step 500, fee rounding, presence pill, signup data-loss + localized auth errors

## 2026-09-06
- `728e4c4` fix(client): calculator step 500, fee rounding, presence pill, signup data-loss + localized auth errors — branch `fix/client-final-points-2026-09-06` → main (fast-forward). See [[2026-36]].

## 2026-09-06
- 457d64d chore(deps): bump @tiptap/* 3.22.3→3.31.3, sanitize-html 2.17.7, browserslist 4.28.9 — npm audit 0

## 2026-09-06 (deps)
- `457d64d` chore(deps): @tiptap/* 3.31.3, sanitize-html 2.17.7, browserslist 4.28.9, npm audit 0 — branch `chore/dependency-bumps-2026-09-06` → main (fast-forward). See [[2026-36]].
