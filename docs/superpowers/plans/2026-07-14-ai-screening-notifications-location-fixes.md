# AI Screening + Notifications + Location Fixes (client images 14-07-01…09) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all issues in the client's 9 screenshots (folder `~/Desktop/Fixes in recruito/AI screening and notifications`): AI screening outage messaging, wrong/numbered screening gaps, job-location capture + display format, and support-request visibility on the admin side.

**Architecture:** Next.js App Router (`rekryteringsplattform/`) + Supabase (Postgres/RLS) + `@anthropic-ai/sdk`. All work is inside `rekryteringsplattform/` except ops steps. One new migration (070), one new shared helper (`formatJobLocation`), one new error classifier (`isAiUnavailableError`), prompt + parser hardening, i18n keys in all 4 dictionaries.

**Tech Stack:** TypeScript, Zod validation, vitest-style `describe/it/expect` tests (mirror neighbouring `*.test.ts`), Supabase CLI for local migrations.

**Root causes (verified 2026-07-14):**
- Images 07/08/09: prod Vercel logs show every screening path failing with Anthropic HTTP 400 *"Your credit balance is too low"* (05:09–05:19 UTC 2026-07-14). Code collapses ALL Anthropic errors into generic "Evaluation failed"/"Screening failed. Please try again." — no error-type distinction anywhere.
- Image 06: the eval prompt's numbered criteria 4–7 (years/employment/short-term/overqualification) leak verbatim into the "KEY GAPS" bullets; `extractCriticalGaps.clean()` strips bullets but not leading `"N. "`. Eval is CV-vs-JD only (client req 2026-07-08 excluded screening Q&A), so the model never sees the candidate's declared employment status / years — hence contradictions.
- Images 02–05: `jobs.location` is free text, `NOT NULL` (migration 001), required in wizard + Zod; display sites print it raw. `jobs.city`/`country` are nullable and displayed only by `JobPreviewCard` as "City, Country".
- Image 01: recruiter Contact-Support **does** arrive in-app since be20b27 (thread in `/admin/messages` + bell to all admins) — but the bell uses generic `notif.newMessageTitle`, `/admin/notifications` is an outbound composer (not an inbox), and the client's test predates the fix deployment (log: `sendSupportRequest: no support inbox configured`, 2026-07-13 14:45, old deploy).

**Image → task map:**

| Image | Client ask | Fixed by |
|---|---|---|
| 14-07-01 | Support message not visible admin-side; notification or email? | Task 8 + Ops 4 |
| 14-07-02 | Rename "Location (free text)" → "Area name near job location / Zip code", optional | Tasks 1–2 |
| 14-07-03 | Company job detail: show "City, Area, Country" | Task 3–4 |
| 14-07-04 | Recruiter marketplace cards: same format | Task 3–4 |
| 14-07-05 | Admin job detail: same format | Task 3–4 |
| 14-07-06 | Gaps wrong + numbering starts at 4 | Tasks 5–6 |
| 14-07-07/08/09 | No AI score / Evaluation failed / Screening failed | **Ops 1** + Task 7 |

---

## Ops prerequisites (Henrik, not the implementing engineer)

1. **Top up Anthropic credits** — console.anthropic.com → Plans & Billing (org `c6d8b54f-dc65-4c99-84d3-80ea9a67c9b3`). This is the ONLY thing that brings screening back; the code work below only improves what users see while it's down. Caution: keep `ANTHROPIC_MODEL` at `claude-sonnet-4-6` (or unset) — `run-evaluation.ts` sends `temperature: 0`, which 400s on Sonnet 5 / Opus 4.7+.
2. **Run the prod-repair SQL** in the prod Supabase SQL editor: [Dev-Notes/prod-repair-2026-07-14-migrations-038-039.md](../../../Dev-Notes/prod-repair-2026-07-14-migrations-038-039.md) (missing `consume_rate_limit` + `audit_log`; verified idempotent on local stack). Unrelated to the 9 images but active prod drift.
3. **After Task 1 merges:** run `ALTER TABLE jobs ALTER COLUMN location DROP NOT NULL;` in the prod SQL editor (prod migrations are applied manually).
4. **Answer for the client (image 01):** support messages arrive **in-app**: every admin's bell (top right) + **Admin → Messages** ("Recruito Messages" thread per recruiter). They only mirror to email when an email provider is configured — prod currently has none (no `RESEND_API_KEY`/SMTP), so email silently no-ops. `/admin/notifications` is for *sending* broadcasts, not an inbox — that's why nothing shows there.

---

### Task 1: Migration 070 — make `jobs.location` nullable

**Files:**
- Create: `rekryteringsplattform/supabase/migrations/070_jobs_location_optional.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Client req 2026-07-14 (image 14-07-02): the free-text location field becomes
-- "Area name near job location / Zip code" and is OPTIONAL. Display composes
-- "City, Area, Country" from city + location + country instead (formatJobLocation).
-- No new table → no GRANT needed (CLAUDE.md §6).
ALTER TABLE jobs ALTER COLUMN location DROP NOT NULL;
```

- [ ] **Step 2: Apply locally and verify**

Run (in `rekryteringsplattform/`): `npx supabase migration up --local`
Expected: `Applying migration 070_jobs_location_optional.sql...` no error.
Verify: `docker exec -i supabase_db_rekryteringsplattform psql -U postgres -d postgres -tAc "SELECT is_nullable FROM information_schema.columns WHERE table_name='jobs' AND column_name='location';"` → `YES`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/070_jobs_location_optional.sql
git commit -m "feat(jobs): migration 070 — jobs.location nullable (area/zip becomes optional)"
```

---

### Task 2: Wizard — rename the field, make it optional

**Files:**
- Modify: `rekryteringsplattform/src/lib/validation/forms.ts:246`
- Modify: `rekryteringsplattform/src/app/(dashboard)/company/jobs/new/create-job-form.tsx:251,353-359,640-642` (the edit page reuses this form)
- Modify: `rekryteringsplattform/src/lib/actions/jobs.ts:172,473`
- Modify: `rekryteringsplattform/src/i18n/dictionaries/{en,sv,no,da}.json:1547-1548`
- Test: `rekryteringsplattform/src/lib/validation/forms.test.ts`

- [ ] **Step 1: Write the failing test** — in `forms.test.ts`, next to existing createJob schema tests, add:

```ts
it("accepts a job with no free-text location (area/zip is optional)", () => {
  const fd = makeValidJobFormData(); // reuse the existing valid-fixture helper in this file
  fd.delete("location");
  const result = validateJobForm(fd);
  expect("error" in result ? result.error : null).toBeNull();
});
```

(Adapt helper/assert names to the file's existing pattern — read the top of `forms.test.ts` first; if it builds FormData inline, copy the nearest passing createJob test and drop `location`.)

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -- forms` — Expected: FAIL (location currently required, min 2 chars).

- [ ] **Step 3: Make the schema optional** — `forms.ts:246`:

```ts
// before
location: i18nRequiredText(t, "validation.fieldLocation", 2, 120),
// after
location: optionalText(120),
```

- [ ] **Step 4: Un-require in the form** — `create-job-form.tsx`:

Line 251: `1: ["title", "location", "industry"],` → `1: ["title", "industry"],`

Lines 640–642 — drop the asterisk and `required`:

```tsx
<label className={labelClass}>{t("jobForm.locationFreeText")}</label>
<Input name="location" value={formData.location} onChange={handleInputChange}
    placeholder={t("jobForm.locationPlaceholder")} className={cn(errClass("location"))} />
```

Lines 353–359 — DELETE the auto-fill block (it would copy "City, Country" into the area field and duplicate in the composed display):

```ts
// DELETE:
if (!finalData.location.trim() && finalData.city.trim()) {
    finalData.location = finalData.country
        ? `${finalData.city}, ${finalData.country}`
        : finalData.city;
}
```

- [ ] **Step 5: Null-safe writes** — `jobs.ts`:

Line 172 (create; drop the city fallback for the same duplication reason):

```ts
location: d.location || raw("location") || null,
```

Line 473 (update): `location: d.location,` → `location: d.location || null,`

- [ ] **Step 6: Rename in all 4 dictionaries** — lines 1547–1548 of each. ⚠️ These files contain duplicate JSON keys — edit as TEXT (Edit tool), never parse/re-serialize.

| dict | `jobForm.locationFreeText` | `jobForm.locationPlaceholder` |
|---|---|---|
| en | `Area name near job location / Zip code (optional)` | `e.g. Down Town / 111 22` |
| sv | `Områdesnamn nära arbetsplatsen / Postnummer (valfritt)` | `t.ex. Down Town / 111 22` |
| no | `Områdenavn nær arbeidsstedet / Postnummer (valgfritt)` | `f.eks. Down Town / 0150` |
| da | `Områdenavn nær arbejdsstedet / Postnummer (valgfrit)` | `f.eks. Down Town / 1050` |

(`validation.fieldLocation` stays — still used by max-length errors.)

- [ ] **Step 7: Run tests, verify pass**

Run: `npm test -- forms` — Expected: PASS including the new test.

- [ ] **Step 8: Commit**

```bash
git add src/lib/validation/forms.ts "src/app/(dashboard)/company/jobs/new/create-job-form.tsx" src/lib/actions/jobs.ts src/i18n/dictionaries/*.json src/lib/validation/forms.test.ts
git commit -m "fix(jobs): location field → optional area/zip (client 14-07-02)"
```

---

### Task 3: `formatJobLocation` helper (TDD)

**Files:**
- Create: `rekryteringsplattform/src/lib/format-job-location.ts`
- Test: `rekryteringsplattform/src/lib/format-job-location.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest"; // match the import style of src/lib/screening/extract-critical-gaps.test.ts
import { formatJobLocation } from "./format-job-location";

describe("formatJobLocation", () => {
  it("composes city, area, country", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "Down Town", country: "Sweden" }))
      .toBe("Stockholm, Down Town, Sweden");
  });
  it("supports zip codes as area", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "94103", country: "Sweden" }))
      .toBe("Stockholm, 94103, Sweden");
  });
  it("omits missing area", () => {
    expect(formatJobLocation({ city: "Stockholm", location: null, country: "Sweden" }))
      .toBe("Stockholm, Sweden");
  });
  it("strips a legacy city prefix from the free-text location", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "Stockholm Down Town", country: "Sweden" }))
      .toBe("Stockholm, Down Town, Sweden");
  });
  it("drops an area that merely repeats city or country", () => {
    expect(formatJobLocation({ city: "Stockholm", location: "Stockholm", country: "Sweden" }))
      .toBe("Stockholm, Sweden");
  });
  it("normalizes legacy country values", () => {
    // "Sverige" must be a key in LEGACY_COUNTRY_MAP (job-form-options.ts:233-253); if not, pick one that is.
    expect(formatJobLocation({ city: "Stockholm", location: "", country: "Sverige" }))
      .toBe("Stockholm, Sweden");
  });
  it("falls back to free text alone when city/country missing", () => {
    expect(formatJobLocation({ city: "", location: "Remote", country: "" })).toBe("Remote");
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- format-job-location` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import { normalizeCountry } from "@/lib/job-form-options";

type LocationParts = {
  city?: string | null;
  location?: string | null; // free-text area / zip; legacy rows may embed the city
  country?: string | null;
};

// Client-requested display format (2026-07-14, images 03-05):
// "City, Area, Country" — e.g. "Stockholm, Down Town, Sweden",
// "Stockholm, 94103, Sweden", or just "Stockholm, Sweden".
export function formatJobLocation(job: LocationParts): string {
  const city = (job.city ?? "").trim();
  const country = job.country?.trim() ? normalizeCountry(job.country.trim()) : "";
  let area = (job.location ?? "").trim();
  if (city && area) {
    const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    area = area.replace(new RegExp(`^${escaped}[,\\s]*`, "i"), "").trim();
  }
  if (
    area &&
    (area.toLowerCase() === city.toLowerCase() || area.toLowerCase() === country.toLowerCase())
  ) {
    area = "";
  }
  return [city, area, country].filter(Boolean).join(", ");
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test -- format-job-location` — Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add src/lib/format-job-location.ts src/lib/format-job-location.test.ts
git commit -m "feat(jobs): formatJobLocation — City, Area, Country display helper"
```

---

### Task 4: Swap all location display sites to `formatJobLocation`

**Files (all Modify):**
- `src/app/(dashboard)/company/jobs/[id]/page.tsx:202`
- `src/components/dashboard/recruiter/recruiter-jobs-list.tsx:353`
- `src/app/(dashboard)/recruiter/mandates/[id]/page.tsx:147`
- `src/app/(dashboard)/recruiter/page.tsx:98`
- `src/components/dashboard/recruiter/recruiter-mandates-view.tsx:232`
- `src/app/(dashboard)/admin/jobs/page.tsx:63`
- `src/app/(dashboard)/admin/companies/[id]/page.tsx:88`
- `src/components/dashboard/shared/job-preview-card.tsx:117-122`
- `src/app/(dashboard)/company/jobs/jobs-table.tsx:136`
- `src/lib/actions/applications.ts:81`
- Data shaping: `src/lib/actions/recruiter.ts:355,676,831`, `src/lib/actions/admin.ts:428,1723`, `src/lib/actions/jobs.ts:299,359`

Line numbers are as of commit e641bc8 — re-grep before editing: `grep -rn "job\.location\|mandate\.location\|j\.location" src/ --include="*.tsx" --include="*.ts" | grep -v test`

- [ ] **Step 1: Ensure city/country reach the views.** For each data-shaping site that passes `location` but not `city`/`country`, add both fields. Pattern (e.g. `jobs.ts:299` select): `"title, industry, location, country, fee_percentage, company_id"` → add `, city`. `jobs.ts:359`: `location: job.location || "Not specified",` → also pass `city: job.city ?? null, country: job.country ?? null,`. Same treatment at `recruiter.ts:355,676,831` and `admin.ts:428,1723` (add `city`/`country` to both the `.select(...)` string and the mapped object wherever missing). If a query already selects `*`, only the mapped object needs the fields.

- [ ] **Step 2: Swap the render sites.** Import `import { formatJobLocation } from "@/lib/format-job-location";` in each file, then:

| Site | Before | After |
|---|---|---|
| company/jobs/[id]/page.tsx:202 | `{job.location}` | `{formatJobLocation(job) || job.location}` |
| recruiter-jobs-list.tsx:353 | `{job.location}` | `{formatJobLocation(job) || job.location}` |
| recruiter/mandates/[id]/page.tsx:147 | `{mandate.location || dict.common.notSpecified}` | `{formatJobLocation(mandate) || dict.common.notSpecified}` |
| recruiter/page.tsx:98 | `{mandate.location}` | `{formatJobLocation(mandate) || mandate.location}` |
| recruiter-mandates-view.tsx:232 | `{mandate.location}` | `{formatJobLocation(mandate) || mandate.location}` |
| admin/jobs/page.tsx:63 | `{job.location || dict.common.noDataDash}` | `{formatJobLocation(job) || dict.common.noDataDash}` |
| admin/companies/[id]/page.tsx:88 | `{j.location}` | `{formatJobLocation(j) || j.location}` |
| jobs-table.tsx:136 | `{job.city || job.location || "—"}` | `{formatJobLocation(job) || "—"}` |
| applications.ts:81 | `location: [job.city, job.country].filter(Boolean).join(", ") || null,` | `location: formatJobLocation(job) || null,` |

- [ ] **Step 3: JobPreviewCard badge** — `job-preview-card.tsx:117-122`:

```tsx
{!hideHeading && (job.city || job.location) && (
    <span className="flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-slate-600 font-medium">
        <MapPin className="h-3.5 w-3.5" /> {formatJobLocation(job)}
    </span>
)}
```

- [ ] **Step 4: Verify** — `npm run build` (Expected: exit 0) and `npm test` (Expected: all pass). Then local-stack spot-check (see Task 9) that a job with city "Stockholm", area "Down Town", country "Sweden" renders "Stockholm, Down Town, Sweden" on: company job detail, recruiter marketplace card, admin job detail.

- [ ] **Step 5: Commit**

```bash
git add -A src/
git commit -m "fix(jobs): compose location as City, Area, Country everywhere (client 14-07-03/04/05)"
```

---

### Task 5: Gap parser — strip leading criterion numbers (TDD)

**Files:**
- Modify: `rekryteringsplattform/src/lib/screening/extract-critical-gaps.ts:20-28`
- Test: `rekryteringsplattform/src/lib/screening/extract-critical-gaps.test.ts`

- [ ] **Step 1: Write the failing test** (append to the existing describe block):

```ts
it("strips leading criterion numbers from gap lines (client 14-07-06)", () => {
  const md = [
    "3. KEY GAPS",
    "- 4. Years of Professional Experience (20%)",
    "- 5. Current Employment Status (15%)",
    "- 6. Short-Term Positions (10%)",
    "- 7. Overqualification (5%)",
  ].join("\n");
  expect(extractCriticalGaps(md)).toEqual([
    "Years of Professional Experience (20%)",
    "Current Employment Status (15%)",
    "Short-Term Positions (10%)",
    "Overqualification (5%)",
  ]);
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- extract-critical-gaps` — Expected: FAIL (values keep `"4. "` prefixes).

- [ ] **Step 3: Fix `clean()`** — add one line after the bullet strip:

```ts
function clean(s: string): string {
  return s
    .replace(/^[\s>*\-•|]+/, "") // leading bullet/table/quote marks
    .replace(/^\d+[.)]\s*/, "") // leading criterion numbers ("4. ") — client 14-07-06
    .replace(/[*_`]+/g, "") // markdown emphasis
    .replace(/\|/g, " ") // stray table pipes
    .replace(/^🔴\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}
```

- [ ] **Step 4: Run tests** — `npm test -- extract-critical-gaps` — Expected: PASS (all, including pre-existing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/screening/extract-critical-gaps.ts src/lib/screening/extract-critical-gaps.test.ts
git commit -m "fix(screening): gap list no longer inherits prompt criterion numbers"
```

---

### Task 6: Prompt — clean KEY GAPS output + candidate-declared facts

**Files:**
- Modify: `rekryteringsplattform/src/lib/screening/evaluation-prompt.ts:69-71,210-226` (+ the template, anchor "SECTION A — CORE SCREENING")
- Modify: `rekryteringsplattform/src/lib/screening/eval-data.ts` (candidate select + `EvalData` type)
- Modify: `rekryteringsplattform/src/lib/screening/run-evaluation.ts:62-72`
- Tests: `evaluation-prompt.test.ts`, `eval-data.test.ts`, `run-evaluation.test.ts` (extend existing)

**Scope guard:** client req 2026-07-08 (screening Q&A excluded from eval) STAYS. Declared facts = the form's own fields (`candidates.employment_status`, `candidates.years_experience`), not screening Q&A.

- [ ] **Step 1: Failing test — prompt contains declared facts and the no-numbering instruction** (append to `evaluation-prompt.test.ts`, mirroring its existing fixture style):

```ts
it("includes candidate-declared facts and forbids numbered gap bullets", () => {
  const prompt = fillEvaluationPrompt({
    jdText: "JD",
    config: { targetSector: null, adjacentSectors: [], transferableSkills: [], customKeywords: [] },
    metadata: { screeningId: "s", modelVersion: "m", isoTimestamp: "t", jdId: "j", cvHash: "h" },
    declared: { employmentStatus: "employed", yearsExperience: 7 },
  });
  expect(prompt).toContain("CANDIDATE-DECLARED FACTS");
  expect(prompt).toContain("employed");
  expect(prompt).toContain("7");
  expect(prompt).toContain("Do NOT number the bullets");
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- evaluation-prompt` — Expected: FAIL.

- [ ] **Step 3: Rewrite KEY GAPS section** (lines 69–71):

```
3. KEY GAPS
   What key JD elements are missing from the CV?
   (Short reply. Include approximate % weight of each gap.)
   Output as plain "- " bullets, each naming the missing JD element in words.
   Do NOT number the bullets, and do NOT repeat the numbered criteria titles
   below (years of experience, employment status, short-term positions,
   overqualification) as gap lines — those are reported in their own sections.
```

- [ ] **Step 4: Add the declared-facts block to the template** — insert immediately BEFORE the `══…SECTION A — CORE SCREENING` banner:

```
CANDIDATE-DECLARED FACTS (from the recruiter's submission form — not screening Q&A)
- Current employment status: {DECLARED_EMPLOYMENT_STATUS}
- Total years of professional experience: {DECLARED_YEARS_EXPERIENCE}
Treat these as authoritative context for criteria 4 and 5 when the CV is
ambiguous. Only raise a criteria 4–7 concern when the CV itself clearly
evidences it; never flag a criterion these facts contradict.

```

- [ ] **Step 5: Extend `fillEvaluationPrompt`** (lines 210–226):

```ts
export function fillEvaluationPrompt(input: {
  jdText: string;
  config: EvalConfig;
  metadata: EvalMetadata;
  declared?: { employmentStatus: string | null; yearsExperience: number | null };
}): string {
  const { jdText, config, metadata, declared } = input;
  return PROMPT_TEMPLATE.replace("{JD_TEXT}", jdText.trim() || "(missing)")
    .replace("{TARGET_SECTOR}", orNotSpecified(config.targetSector))
    .replace("{ADJACENT_SECTORS}", listOrNotSpecified(config.adjacentSectors))
    .replace("{TRANSFERABLE_SKILLS}", listOrNotSpecified(config.transferableSkills))
    .replace("{CUSTOM_KEYWORDS}", listOrNotSpecified(config.customKeywords))
    .replace("{DECLARED_EMPLOYMENT_STATUS}", orNotSpecified(declared?.employmentStatus))
    .replace("{DECLARED_YEARS_EXPERIENCE}",
      declared?.yearsExperience != null ? String(declared.yearsExperience) : "(not specified)")
    .replace("{SCREENING_ID}", metadata.screeningId)
    .replace("{MODEL_VERSION}", metadata.modelVersion)
    .replace("{ISO_TIMESTAMP}", metadata.isoTimestamp)
    .replace("{JD_ID}", metadata.jdId)
    .replace("{CV_HASH}", metadata.cvHash);
}
```

- [ ] **Step 6: Fetch the declared facts** — `eval-data.ts`: candidate select `"id, job_id, cv_file_path"` → `"id, job_id, cv_file_path, employment_status, years_experience"`; add to the returned `EvalData` object and its type:

```ts
declaredEmploymentStatus: (c.employment_status as string | null) ?? null,
declaredYearsExperience: (c.years_experience as number | null) ?? null,
```

- [ ] **Step 7: Pass them through** — `run-evaluation.ts:62-72`, extend the `fillEvaluationPrompt` call:

```ts
  const prompt = fillEvaluationPrompt({
    jdText: data.jdText,
    config: data.config,
    declared: {
      employmentStatus: data.declaredEmploymentStatus,
      yearsExperience: data.declaredYearsExperience,
    },
    metadata: { screeningId, modelVersion: model, isoTimestamp: new Date().toISOString(), jdId: data.jobId, cvHash },
  });
```

- [ ] **Step 8: Run screening tests** — `npm test -- screening` — Expected: PASS (fix any `eval-data.test.ts`/`run-evaluation.test.ts` fixtures that now need the two new fields).

- [ ] **Step 9: Commit**

```bash
git add src/lib/screening/
git commit -m "fix(screening): gaps = JD-only plain bullets; prompt sees declared employment/years (client 14-07-06)"
```

---

### Task 7: AI-unavailable error classification + distinct UI message

**Files:**
- Create: `rekryteringsplattform/src/lib/screening/ai-error.ts`
- Test: `rekryteringsplattform/src/lib/screening/ai-error.test.ts`
- Modify: `run-evaluation.ts:74-98`, `src/lib/actions/candidates-extended.ts:457-459`, `src/components/dashboard/recruiter/candidate-submission-form.tsx:299-305`, `src/components/dashboard/admin/run-screening-button.tsx:13-16`, 4 dictionaries (near `aiScreenErrFailed`, en.json:925)

- [ ] **Step 1: Failing test** — `ai-error.test.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { isAiUnavailableError } from "./ai-error";

function apiError(status: number, message: string): unknown {
  const err = Object.create(Anthropic.APIError.prototype);
  Object.assign(err, { status, message });
  return err;
}

describe("isAiUnavailableError", () => {
  it("flags credit-exhaustion 400s", () => {
    expect(isAiUnavailableError(apiError(400, "Your credit balance is too low to access the Anthropic API."))).toBe(true);
  });
  it("flags auth / rate-limit / overload statuses", () => {
    expect(isAiUnavailableError(apiError(401, "invalid x-api-key"))).toBe(true);
    expect(isAiUnavailableError(apiError(429, "rate_limit_error"))).toBe(true);
    expect(isAiUnavailableError(apiError(529, "overloaded_error"))).toBe(true);
  });
  it("does not flag ordinary 400s or non-API errors", () => {
    expect(isAiUnavailableError(apiError(400, "max_tokens: field required"))).toBe(false);
    expect(isAiUnavailableError(new Error("boom"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test -- ai-error` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `ai-error.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";

// Operator-side Anthropic failures (billing/credits, auth, provider rate limits,
// overload/5xx). These mean "AI is down for us" — the UI shows a dedicated
// message instead of the generic "try again" (which can't help the user).
export function isAiUnavailableError(err: unknown): boolean {
  if (!(err instanceof Anthropic.APIError)) return false;
  const status = err.status ?? 0;
  if (status === 401 || status === 403 || status === 429 || status >= 500) return true;
  return status === 400 && /credit balance/i.test(err.message ?? "");
}
```

- [ ] **Step 4: Run tests** — `npm test -- ai-error` — Expected: PASS.

- [ ] **Step 5: Wrap the primary Anthropic call** — `run-evaluation.ts` (import `isAiUnavailableError` at top):

```ts
  const anthropic = new Anthropic({ apiKey });
  let response: Awaited<ReturnType<typeof anthropic.messages.create>>;
  try {
    response = await anthropic.messages.create({
      /* …existing args unchanged… */
    });
  } catch (err) {
    if (isAiUnavailableError(err)) {
      console.error("[run-evaluation] AI unavailable", err);
      return { ok: false, error: "ai_unavailable", status: 503 };
    }
    throw err;
  }
```

(The second-pass client-report call already swallows failures — leave it.)

- [ ] **Step 6: Let the code through the recruiter action** — `candidates-extended.ts:458`:

```ts
const known =
    result.error === "no_cv" ||
    result.error === "unsupported_cv_format" ||
    result.error === "ai_unavailable";
```

- [ ] **Step 7: Map in both UIs.**

`candidate-submission-form.tsx:299-305` — add to `screenErrors`:

```ts
ai_unavailable:
    r.aiScreenErrUnavailable ||
    "AI screening is temporarily unavailable. Your draft is saved — try again later.",
```

`run-screening-button.tsx:13-16` — add to `RUN_ERRORS`:

```ts
ai_unavailable: "AI screening is temporarily unavailable (provider/billing issue). Try again later.",
```

- [ ] **Step 8: i18n key in 4 dictionaries** — insert after `aiScreenErrFailed` (en.json:925; text-edit only):

| dict | `aiScreenErrUnavailable` |
|---|---|
| en | `AI screening is temporarily unavailable. Your draft is saved — try again later.` |
| sv | `AI-granskningen är tillfälligt otillgänglig. Ditt utkast är sparat — försök igen senare.` |
| no | `AI-screeningen er midlertidig utilgjengelig. Utkastet ditt er lagret — prøv igjen senere.` |
| da | `AI-screeningen er midlertidigt utilgængelig. Dit udkast er gemt — prøv igen senere.` |

- [ ] **Step 9: Full screening tests** — `npm test -- screening` and `npm test -- ai-error` — Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/screening/ src/lib/actions/candidates-extended.ts src/components/dashboard/recruiter/candidate-submission-form.tsx src/components/dashboard/admin/run-screening-button.tsx src/i18n/dictionaries/*.json
git commit -m "fix(screening): classify Anthropic outages as ai_unavailable with distinct message (client 14-07-07/08/09)"
```

---

### Task 8: Support bell notification says "Support request"

**Files:**
- Modify: `rekryteringsplattform/src/lib/actions/messages.ts:793`
- Modify: 4 dictionaries near `notif.newMessageTitle` (en.json:1829)

`sendRecruiterSupportMessage` serves ONLY the Recruito support thread (both the support chat page and the Contact-Support card route through it), so a support-specific title is safe for all callers.

- [ ] **Step 1: Change the title key** — `messages.ts:793`: `titleKey: "notif.newMessageTitle",` → `titleKey: "notif.supportRequestTitle",`

- [ ] **Step 2: Add the key to 4 dictionaries** (next to `newMessageTitle`, same `{sender}` param syntax; text-edit only):

| dict | `notif.supportRequestTitle` |
|---|---|
| en | `Support request from {sender}` |
| sv | `Supportförfrågan från {sender}` |
| no | `Støtteforespørsel fra {sender}` |
| da | `Supportanmodning fra {sender}` |

- [ ] **Step 3: Verify** — `npm run build` — Expected: exit 0 (missing dictionary keys fail the build).

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/messages.ts src/i18n/dictionaries/*.json
git commit -m "fix(support): admin bell labels support requests explicitly (client 14-07-01)"
```

---

### Task 9: Production-ready gate + local-stack e2e

- [ ] **Step 1:** In `rekryteringsplattform/`: `npm run build` — Expected: exit 0. `npm run lint` — Expected: 0 errors (build does NOT run ESLint — both are required, see CLAUDE.md §8).
- [ ] **Step 2:** `npm test` — Expected: all suites pass (was 265+ before this work; now +~12).
- [ ] **Step 3: Local-stack e2e** (per `reference_localstack_e2e`: `npx supabase migration up --local`, then `npx dotenv-cli -e .env.localstack -- npx next dev`; users are `*@local.test`; NEVER drive `.env.local` — that's prod):
  1. **Image 02:** company → create job leaving area/zip empty → publishes without validation error; label reads "Area name near job location / Zip code (optional)".
  2. **Images 03/04/05:** create job city=Stockholm, area=Down Town, country=Sweden → company job detail, recruiter marketplace card, and admin job detail all show "Stockholm, Down Town, Sweden".
  3. **Image 01:** recruiter → job detail → Contact Support → send ≥10 chars → as admin: bell shows "Support request from …" and the thread appears under Admin → Messages.
  4. **Images 07/08/09:** with `ANTHROPIC_API_KEY` unset locally the route returns "AI service not configured" (pre-existing). To exercise `ai_unavailable`, point `ANTHROPIC_BASE_URL` at the local mock (see the candidate-presentation-rework e2e setup) returning HTTP 400 with body `{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}` → recruiter form shows the new "temporarily unavailable" message; admin Run-AI-screening shows the provider/billing message.
  5. **Image 06:** with the mock returning a fixture report whose KEY GAPS bullets carry `- 4. …` prefixes → the recruiter Gaps list renders without leading numbers.
- [ ] **Step 4:** Capture evidence (screenshots/console output) for the handoff summary.

---

## Self-review (done at plan time)

- **Spec coverage:** all 9 images map to tasks (see table); the credits investigation is answered with prod-log evidence and Ops 1.
- **Placeholder scan:** every code step carries real code; the only "adapt to file style" notes are for test-fixture reuse in existing test files, with the copy-nearest-test fallback stated.
- **Type consistency:** `formatJobLocation(LocationParts)`, `declared{employmentStatus,yearsExperience}`, error code string `"ai_unavailable"`, and dict keys `aiScreenErrUnavailable`/`notif.supportRequestTitle` are used with identical names across all tasks.
- **Known risks:** display-swap line numbers may drift (Task 4 Step 0 re-grep); `evaluation-prompt.test.ts`/`eval-data.test.ts` fixtures may need the two new fields (called out in Task 6 Step 8); dictionaries must be edited as text (duplicate keys — called out twice).
