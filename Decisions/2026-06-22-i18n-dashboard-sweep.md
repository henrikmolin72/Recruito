# 2026-06-22 — Full i18n sweep of dashboard components

## Context
Client reported that recruiter/admin/corporate pages showed hardcoded Swedish even
when English was selected. Audit found ~25 dashboard components with raw Swedish
strings that never went through the dictionary.

## What was done
Migrated every offending component to the existing i18n system, all 4 locales
(en/sv/da/no), and brought the build green.

- **Client components** → `useTranslations()` hook → `t("namespace.key")`. The
  client `t` has no param interpolation, so dynamic values use
  `t(key).replace("{x}", v)`.
- **Server components** → `createTranslator()` from `@/i18n/server` (its `t`
  supports params). Made affected components/pages `async`; metadata via
  `generateMetadata()`.
- Module-level label maps (`REASONS`, `NEXT_STEP_OPTIONS`, `CHECKLIST_LABELS`,
  `STATUS dot titles`) converted to hold dict **keys**, resolved with `t()` at the
  call site (thread `t` into helpers).
- ~290 new keys added across `recruiter` / `company` / `admin` / `components` /
  `common` slices, kept at full parity across all 4 dictionaries (1663 keys each).
- Hardcoded `toLocaleString("sv-SE")` / `toLocaleDateString("sv-SE")` → locale
  default.

Components touched (non-exhaustive): company-next-step-panel, recruiter-approval-actions,
candidate-next-step-request-actions, public-application-link-card, candidate-score-card,
shortlist-generator, application-review-actions, performance-metrics, draft-row-actions,
the 5 guarantee components, data-rights-actions, admin-data-rights-row, placement-actions,
stats-card, pipeline-builder, evaluation-prompt-panel, plus the admin/company/recruiter
data-rights pages and company layout.

## Accepted exceptions
- `download-job-description.tsx`: the regex `[^a-zA-ZåäöÅÄÖ0-9 ]` legitimately
  preserves Swedish chars in download filenames (kept). Filename suffix left as-is.
- `app/page.tsx` landing demo placeholder: dev-only (shows when the demo-video env
  var is unset), public landing page (outside the dashboard scope) → converted to
  neutral English rather than dictionary keys.
- **Legal pages** (`app/gdpr/page.tsx`, `app/integritetspolicy/page.tsx`): left in
  Swedish by explicit decision (user, 2026-06-23). Public, legally-binding GDPR /
  privacy text — should be professionally translated/reviewed, not machine-translated.
  A follow-up non-å/ä/ö word-scan confirmed these are the ONLY files with remaining
  hardcoded Swedish; the recruiter/admin/corporate dashboard is fully localized.

## Lessons (important)
1. **`npm run build | tail` masks the real exit code** — the pipe reports `tail`'s
   status (0), not the build's. Several "green" notifications were tail's exit code.
   Always capture `npm run build > log; echo "EXIT=$?"` and read that line. Two real
   failures (a missed `option.label` after a `label`→`labelKey` refactor, and a
   `t`-scope error in a sub-component) were hiding behind false "exit 0".
2. **Detection was å/ä/ö-anchored.** Swedish strings without special characters
   (e.g. "Stegnamn") slip through. A supplementary word-scan caught the stragglers,
   but a future audit should not rely on special-char detection alone.

## Status
Build green (verified real exit code), full locale parity, raw-Swedish tracker
empty. Not yet committed — review the diff before committing.
