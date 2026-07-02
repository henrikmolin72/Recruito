# Canonical country values: English, "United States"

**Date:** 2026-07-01
**Status:** Decided

## Context

The job publish form stored Swedish country names in `jobs.country`; recruiter onboarding stored English names in `recruiters.locations` / `countries_experience`. The recruiter notification matcher (`jobs.ts` → `notifyMatchingRecruitersAboutJob`) does exact `.includes(job.country)`, so almost no job ever location-matched a recruiter. Additionally the two English lists disagreed on "USA" (job form) vs "United States" (recruiter onboarding).

## Decision

1. **Canonical values are the English names in `COUNTRY_OPTIONS`** (`src/lib/job-form-options.ts`), with **"United States"** (not "USA") — chosen because the recruiter side already stored "United States", so recruiter data and UI need no change.
2. **Legacy values are normalized at read time, not migrated.** `normalizeCountry()` (same file) maps old Swedish names + "USA" → canonical English. Applied in:
   - the job form's `initialData` hydration (edit/publish-draft flow),
   - the notification matcher (`notifyMatchingRecruitersAboutJob`), which fires from `approveJob` / `clientApproveProposedFee` — i.e. NOT through the form, so it must normalize itself.
3. **No data migration.** The only surface left with mixed legacy values is the recruiter jobs-list country filter (display-only, built from live row values) — same accepted tradeoff as the Swedish→English switch. A cosmetic one-off `UPDATE jobs SET country = ...` can be run later if the mixed filter ever bothers anyone.

## Consequence for future work

Any new code comparing `jobs.country` against a list must compare `normalizeCountry(job.country)`, or the legacy rows silently miss.
