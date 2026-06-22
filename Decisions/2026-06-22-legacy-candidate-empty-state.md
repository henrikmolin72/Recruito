---
title: Company candidate view — explicit "not provided by recruiter" note for empty sections
date: 2026-06-22
status: accepted
supersedes: part of e52def0 (2026-06-21 "collapse genuinely-empty sections")
---

# Context

Yesterday (`e52def0`) we made recruiter-entered structured fields **required** at
presentation time, and — to avoid stacking rows of "Not specified" for legacy
candidates — we **collapsed** empty sections on the company candidate view
(Compensation, Employment, Screening) and dropped the empty Location row.

A client then reported the candidate "Ali Rahman" as having "no information in the
boxes." Investigation (this session):

- **The fix was already deployed** — production runs `e8a2882`, which includes
  `e52def0`. The client's screenshot was the *pre-fix* UI (the `|| '-'` Location
  fallback and the always-on "Not specified" Compensation grid — both removed by
  `e52def0`), i.e. a stale/cached view.
- **The data is genuinely empty.** DB read (service-role, candidate
  `e0703534-eaea-498f-b1b1-87d740bc9820`, created **2026-06-14**) confirmed every
  location / compensation / employment field is null and all 3 screening questions
  are unanswered. He predates the required-fields rule and lost structured data to
  the draft bug `e52def0` patched.

The collapse made these legacy candidates show **nothing**, which the client read
as "broken / missing", same as before.

# Decision

For the three recruiter-provided sections (Compensation & Availability, Employment
Status, Screening Answers) and the Location row, **always render the section** and,
when it has no data, show a single explicit muted note —
`company.notProvidedByRecruiter` ("Not provided by the recruiter.", localized in
en/sv/da/no) — instead of silently collapsing.

This keeps the client oriented (they see the category exists and that the recruiter,
not the system, left it blank) without re-introducing the row-of-"Not specified"
clutter that motivated the original collapse.

Language Proficiency stays collapsing — it is genuinely optional and not part of the
required transparency set.

# Consequences

- Legacy / sparsely-presented candidates show one clear note per empty section.
- New candidates (required fields enforced) never hit the note — sections always have data.
- The real remedy for a specific legacy candidate is **re-presentation** by the
  recruiter so the now-required fields get captured. The UI cannot invent data.

Files: `src/app/(dashboard)/company/jobs/[id]/candidates/[candidateId]/page.tsx`,
`src/i18n/dictionaries/{en,sv,da,no}.json`.
