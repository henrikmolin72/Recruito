# Client Launch Fixes Implementation Plan (fee calculator, form validation, 10 screenshot issues)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all client-reported pre-launch fixes: restrict jobs to Full-time + Annual salary (so the fee calculator is always correct), give the job wizard real field-level validation feedback, fix guarantee "0 months" display, admin list fixes (raw i18n key, drafts), an admin "Request changes" workflow, a working Contact Support form, confidential-company masking, and de-duplicated job-detail headers.

**Architecture:** All changes live in `rekryteringsplattform/` (Next.js App Router + Supabase + zod server validation + 4 i18n dictionaries). One small migration (069) adds three columns to `jobs` for the request-changes workflow — everything else is UI/action/i18n edits. No fee-engine changes: restricting input to Annual makes the existing annual-salary fee formula correct by construction.

**Tech Stack:** Next.js 15 App Router, Supabase (service-role via `createAdminClient`), zod, vitest (colocated `*.test.ts`), sonner toasts, i18n dicts `en/sv/no/da.json`.

---

## Ground rules for the executor

- Work on a branch: `git checkout -b fix/client-launch-fixes` from `main`.
- App dir for all commands: `cd rekryteringsplattform`.
- **i18n dictionaries contain duplicate JSON keys. NEVER parse+re-serialize them (no `json.dump`). Edit textually with the Edit tool only.** Every new UI string needs entries in ALL FOUR files: `src/i18n/dictionaries/en.json`, `sv.json`, `no.json`, `da.json` — the build fails otherwise.
- Server actions: every mutation authenticates (`requireAdmin()` or `supabase.auth.getUser()` + role); never return raw Supabase errors to the client.
- Line numbers below were verified 2026-07-12; re-verify context with Read before each Edit.
- Gate before done: `npm run build` AND `npm run lint` (build does NOT run ESLint) AND `npm run test`.

## Decisions locked in (defaults chosen; flag to Henrik if wrong)

1. **Existing non-full-time jobs** (demo/seed "Contract" jobs in the marketplace, screenshot 12-07-03): left untouched. The marketplace filter derives its options from live jobs and self-heals as those jobs close. No data migration.
2. **"0 Month" wording:** we use the existing plural i18n string → "0 months" (sv "0 månader"), not the client's literal "0 Month".
3. **Support inbox:** new env `SUPPORT_EMAIL`, falling back to the existing `INTERNAL_REVIEW_EMAIL`. Recruiter's email is included in the body so support can reply by email.
4. **Request-changes** reuses the existing `draft` status (client explicitly asked for "return to Draft") — no new enum value.

---

### Task 1: i18n — translate `status.pending_approval` (and `pending_client_reconfirm`)

Admin jobs table shows the raw key `status.pending_approval` (screenshot 12-07-06) because `StatusBadge` does `t("status." + status)` (`src/components/shared/status-badge.tsx:58`) and the `status` block in the dictionaries has no such key; the i18n client returns the raw key on miss (`src/i18n/client.tsx:31`).

**Files:**
- Modify: `src/i18n/dictionaries/en.json`, `sv.json`, `no.json`, `da.json` (the `"status"` object, near each file's line ~115–166, next to `"pending": …` at ~L150)

- [ ] **Step 1: Add the two keys to each dictionary** (Edit tool, textual insert after the `"pending"` line inside the `status` object):

en.json:
```json
    "pending": "Pending",
    "pending_approval": "Pending Approval",
    "pending_client_reconfirm": "Pending Re-confirmation",
```
sv.json:
```json
    "pending": "Väntande",
    "pending_approval": "Väntar på godkännande",
    "pending_client_reconfirm": "Väntar på ny bekräftelse",
```
(Keep each file's existing `"pending"` value as-is — only ADD the two new lines.)
no.json: `"pending_approval": "Venter på godkjenning"`, `"pending_client_reconfirm": "Venter på ny bekreftelse"`.
da.json: `"pending_approval": "Afventer godkendelse"`, `"pending_client_reconfirm": "Afventer ny bekræftelse"`.

- [ ] **Step 2: Verify** — Run: `npm run build` in `rekryteringsplattform/`. Expected: PASS (dup-key-safe textual edit).
- [ ] **Step 3: Commit** — `git commit -m "fix(i18n): add status.pending_approval + pending_client_reconfirm labels (all 4 dicts)"`

### Task 2: Admin jobs list — hide drafts

Screenshot 12-07-09: drafts must not appear in the admin "All job listings" table.

**Files:**
- Modify: `src/lib/actions/admin.ts:378-412` (`getAdminJobs`)

- [ ] **Step 1: Add status filter.** In `getAdminJobs`, after the `.select(...)` and before `.order(...)`:
```ts
        .neq("status", "draft")
        .order("created_at", { ascending: false });
```
- [ ] **Step 2: Update the count subtitle expectation** — none needed; the page uses `jobs.length` which now excludes drafts (that is the requested behavior).
- [ ] **Step 3: Test** (mirror the fake-chainable-builder pattern in `src/lib/actions/screening.test.ts`): add to a new `src/lib/actions/admin-jobs.test.ts` a test asserting the query builder received `.neq("status", "draft")`. If mocking `requireAdmin`/`createAdminClient` for this one assertion costs more than ~40 lines, skip the unit test and rely on the e2e check in Task 11 — note it in the commit body.
- [ ] **Step 4: Commit** — `git commit -m "fix(admin): exclude drafts from admin jobs listing"`

### Task 3: Guarantee = 0 shows "0 months" everywhere (was "—" or hidden)

Screenshots 12-07-05 / 12 / 13 / 14. Five render sites; all treat `0` as falsy/hidden. Rule after fix: `null`/`undefined` (never chosen — e.g. legacy) → unchanged behavior; `0` → "0 months".

**Files:**
- Modify: `src/app/(dashboard)/company/jobs/jobs-table.tsx:24-29`
- Modify: `src/app/(dashboard)/company/jobs/[id]/page.tsx:251`
- Modify: `src/components/dashboard/recruiter/recruiter-jobs-list.tsx:392`
- Modify: `src/components/dashboard/shared/job-preview-card.tsx:102, 120` (+ its `formatGuaranteeMonths` helper)

- [ ] **Step 1: jobs-table.tsx** — replace the `formatGuarantee` guard:
```ts
  function formatGuarantee(months: number | null | undefined) {
    if (months == null) return "—";
    return months === 1
      ? (c.guaranteeMonths || "{count} month").replace("{count}", String(months))
      : (c.guaranteeMonthsPlural || "{count} months").replace("{count}", String(months));
  }
```
- [ ] **Step 2: company job detail chip** (`[id]/page.tsx:251`) — change the guard `(job.guarantee_period_months ?? 0) > 0 &&` to `job.guarantee_period_months != null &&`. The label ternary on L255 (`> 1 ? plural : singular`) renders "0 month" for 0 — change it to `=== 1 ? c.guaranteeMonths : c.guaranteeMonthsPlural` so 0 → "0 months".
- [ ] **Step 3: recruiter-jobs-list.tsx:392** — same two changes (guard `!= null`, ternary `=== 1`).
- [ ] **Step 4: job-preview-card.tsx:102 and :120** — same guard change on both. Read the file's `formatGuaranteeMonths` helper; make it `months === 1 ? singular : plural` so 0 renders "0 months".
- [ ] **Step 5: Verify** — `npm run build && npm run lint`. Expected: PASS. Visual check happens in Task 11.
- [ ] **Step 6: Commit** — `git commit -m "fix(ui): guarantee 0 months displays as '0 months' instead of dash/hidden (5 sites)"`

### Task 4: Employment type — Full-time only

Screenshot 12-07-02 + client email. Hide Part-time/Consultant/Contract/Freelance/Internship from the wizard; enforce server-side on publish. Keep the full list for displaying legacy jobs.

**Files:**
- Modify: `src/lib/job-form-options.ts:5-12`
- Modify: `src/app/(dashboard)/company/jobs/new/create-job-form.tsx:201, 645-647`
- Modify: `src/lib/validation/forms.ts:250`
- Modify: `src/i18n/dictionaries/*.json` (1 new validation key × 4)
- Test: `src/lib/validation/forms.test.ts` (new — shared with Task 6)

- [ ] **Step 1: Add the active list** in `job-form-options.ts` directly below `EMPLOYMENT_TYPE_OPTIONS`:
```ts
// ponytail: launch scope is full-time only — restore types here when per-type pricing exists
export const ACTIVE_EMPLOYMENT_TYPE_OPTIONS = ["full_time"] as const;
```
(Keep `EMPLOYMENT_TYPE_OPTIONS` + `EMPLOYMENT_TYPE_DICT_KEY` untouched — legacy jobs still render their labels.)

- [ ] **Step 2: Wizard uses the active list.** In `create-job-form.tsx`:
  - L201 init — coerce legacy drafts: `employment_type: (ACTIVE_EMPLOYMENT_TYPE_OPTIONS as readonly string[]).includes(initialData?.employment_type ?? "") ? initialData!.employment_type : "full_time",`
  - L646 — `{ACTIVE_EMPLOYMENT_TYPE_OPTIONS.map(et => <option key={et} value={et}>{EMPLOYMENT_TYPE_LABELS[et]}</option>)}`
  - Update the import from `@/lib/job-form-options` to include `ACTIVE_EMPLOYMENT_TYPE_OPTIONS`.
  - Leave the `contract_duration` conditional block (L649-655) in place — it is now unreachable and will revive when types return.
- [ ] **Step 3: Server enforcement.** `forms.ts:250` becomes:
```ts
      employment_type: i18nRequiredText(t, "validation.fieldEmploymentType", 2, 40)
        .refine(
          (v) => (ACTIVE_EMPLOYMENT_TYPE_OPTIONS as readonly string[]).includes(v),
          t("validation.employmentTypeUnavailable")
        ),
```
Import at top of forms.ts: `import { ACTIVE_EMPLOYMENT_TYPE_OPTIONS } from "@/lib/job-form-options";`
- [ ] **Step 4: i18n key** `validation.employmentTypeUnavailable` in all 4 dicts (inside the existing `validation` object):
  - en: `"employmentTypeUnavailable": "Only Full-time positions are supported at the moment",`
  - sv: `"employmentTypeUnavailable": "Endast heltidstjänster stöds för närvarande",`
  - no: `"employmentTypeUnavailable": "Kun heltidsstillinger støttes for øyeblikket",`
  - da: `"employmentTypeUnavailable": "Kun fuldtidsstillinger understøttes i øjeblikket",`
- [ ] **Step 5: Failing test first** — create `src/lib/validation/forms.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/server", () => ({
  createTranslator: async () =>
    (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${Object.values(params).join(",")}` : key,
}));

import { validateJobForm } from "./forms";

export function buildValidJobFormData(): FormData {
  const fd = new FormData();
  fd.set("title", "Junior Data Analyst");
  fd.set("location", "Stockholm");
  fd.set("industry", "Biotechnology");
  fd.set("employment_type", "full_time");
  fd.set("description", "A description that is definitely longer than twenty characters.");
  fd.set("salary_currency", "EUR");
  fd.set("salary_min", "38000");
  fd.set("salary_max", "38000");
  fd.set("max_recruiters", "5");
  fd.set("fee_percentage", "15");
  fd.set("guarantee_period_months", "0");
  fd.set("pipeline_stages", JSON.stringify([{ id: "s1", type: "screening", title: "Screening", order: 0 }]));
  return fd;
}

describe("validateJobForm", () => {
  it("accepts a valid full_time job", async () => {
    const r = await validateJobForm(buildValidJobFormData());
    expect(r.success).toBe(true);
  });

  it("rejects non-full_time employment types", async () => {
    const fd = buildValidJobFormData();
    fd.set("employment_type", "contract");
    const r = await validateJobForm(fd);
    expect(r.success).toBe(false);
  });
});
```
Note: if `validateJobForm` requires `pipeline_stages`/other fields differently at parse time, adjust `buildValidJobFormData` until the first test passes GREEN before asserting the second — the builder must represent a genuinely valid publish payload.
- [ ] **Step 6: Run** `npm run test -- forms` — expect the "rejects non-full_time" test to FAIL before Step 3 is applied, PASS after. (If you did Step 3 first, temporarily revert to observe red, or accept the ordering deviation and note it.)
- [ ] **Step 7: Commit** — `git commit -m "feat(jobs): restrict employment type to full_time for launch (form + server validation)"`

### Task 5: Salary period — Annual only (+ align the wizard fee chip)

Screenshot 12-07-01. The fee formula multiplies the calculator value as an **annual** salary; Monthly/Hourly options made fees wrong. Remove the choice; always store `yearly`.

**Files:**
- Modify: `src/app/(dashboard)/company/jobs/new/create-job-form.tsx:134-138, 353-359, 814-821`
- Modify: `src/i18n/dictionaries/*.json` (`jobForm.periodYearly` — drop "(recommended)")

- [ ] **Step 1: Replace the period `<select>`** (L814-821) with a static read-only chip matching the Maximum Salary box style:
```tsx
                                        <div className="max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                                            {t("jobForm.periodYearly")}
                                        </div>
```
Remove `SALARY_PERIOD_OPTIONS` / `SALARY_PERIOD_LABELS` usages that become unused in this file (the labels map L171-175 and the import) — lint will flag them.
- [ ] **Step 2: Always send yearly.** In `buildFormData` (after the calculator overrides at L354-359) add:
```ts
        data.set("salary_period", "yearly");
```
(Leave the zod enum at `forms.ts:285` accepting all three — legacy rows keep validating.)
- [ ] **Step 3: Dict label.** In all 4 dicts change `jobForm.periodYearly` value: en `"Annual (recommended)"` → `"Annual"`, sv `"År (rekommenderat)"` → `"År"`, no/da analogous (strip the parenthetical).
- [ ] **Step 4: Align the wizard's fee chip with the canonical formula.** Replace the hand-rolled memo at L134-138:
```ts
    const recruitmentFee = useMemo(
        () => calculateClientFee(calcState.salary, calcState.guaranteeMonths, calcState.isExclusive),
        [calcState]
    );
```
Import `calculateClientFee` from `@/lib/utils`. (Today the memo hardcodes an independent copy with a `3500` floor vs `CLIENT_FEE_MIN` — one formula, one source.)
- [ ] **Step 5: Verify** — `npm run build && npm run lint`. Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(jobs): salary period fixed to Annual; wizard fee chip reuses calculateClientFee"`

### Task 6: Job wizard validation feedback (field highlighting + descriptive errors)

Client email #2 + screenshots 12-07-15/16. Two layers: (a) server returns *which field* failed so the UI can jump/highlight instead of a bare "Invalid input" toast; (b) the wizard validates on **Next** and **Publish** clicks with inline per-field messages.

**Files:**
- Modify: `src/lib/validation/forms.ts:403-405` (failure return)
- Modify: `src/lib/actions/jobs.ts:49-52` and the draft-update action's `validateJobForm` failure branch (~L443-446)
- Modify: `src/app/(dashboard)/company/jobs/new/create-job-form.tsx` (state, handlers, step 1/2/3/7 fields, nav buttons)
- Modify: `src/i18n/dictionaries/*.json` (2 new keys × 4)
- Test: `src/lib/validation/forms.test.ts` (extend)

- [ ] **Step 1: Failing test** — add to `forms.test.ts`:
```ts
  it("reports the failing field on validation error", async () => {
    const fd = buildValidJobFormData();
    fd.set("location", "");
    const r = await validateJobForm(fd);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.field).toBe("location");
  });
```
Run: `npm run test -- forms` → FAIL (`field` undefined).
- [ ] **Step 2: Server returns the field.** `forms.ts:403-405`:
```ts
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false as const,
      error: issue?.message || t("validation.invalidInput"),
      field: typeof issue?.path?.[0] === "string" ? (issue.path[0] as string) : null,
    };
  }
```
- [ ] **Step 3: Actions pass it through.** In `jobs.ts` `createJob` (L49-52): `return { error: parsed.error, field: parsed.field };` Same in the draft-update action's failure branch (~L443-446). Run tests → PASS.
- [ ] **Step 4: i18n keys** (all 4 dicts, `jobForm` object):
  - en: `"fieldRequired": "This field is required",` `"fixHighlightedFields": "Please fix the highlighted field(s)",`
  - sv: `"fieldRequired": "Det här fältet är obligatoriskt",` `"fixHighlightedFields": "Åtgärda de markerade fälten",`
  - no: `"fieldRequired": "Dette feltet er obligatorisk",` `"fixHighlightedFields": "Rett de markerte feltene",`
  - da: `"fieldRequired": "Dette felt er obligatorisk",` `"fixHighlightedFields": "Ret de markerede felter",`
- [ ] **Step 5: Wizard state + helpers.** In `create-job-form.tsx` near the other `useState` calls (~L106):
```ts
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Which wizard step owns each (server) field — used to jump to the offending step.
    const FIELD_TO_STEP: Record<string, number> = {
        title: 1, country: 1, city: 1, location_code: 1, location: 1, industry: 1,
        employment_type: 2, contract_duration: 2, work_type: 2, remote_type: 2,
        description: 3, key_requirements: 3, language_requirements: 3, team_size: 3,
        reporting_to: 3, position_type: 3, open_positions: 3,
        salary_min: 4, salary_max: 4, salary_currency: 4, salary_period: 4,
        bonus_structure: 4, benefits: 4, benefits_other: 4,
        application_deadline: 5, guarantee_period_months: 1, screening_questions: 5,
        num_interviews: 6, interview_conductors: 6, assessment_type: 6,
        working_hours: 6, shift_work: 6, shift_timings: 6, overtime_policy: 6,
        desired_start_date: 6, urgency_level: 6,
        declaration: 7,
    };

    const REQUIRED_FIELDS_BY_STEP: Record<number, (keyof typeof formData)[]> = {
        1: ["title", "location", "industry"],
        2: ["employment_type"],
        3: ["description"],
    };

    function validateStep(s: number): Record<string, string> {
        const errors: Record<string, string> = {};
        for (const field of REQUIRED_FIELDS_BY_STEP[s] ?? []) {
            const value = formData[field];
            if (typeof value === "string" && !value.trim()) {
                errors[field] = t("jobForm.fieldRequired");
            }
        }
        return errors;
    }
```
- [ ] **Step 6: Clear errors as the user types.** In `handleInputChange` (L254-264) add as the first line of the function body:
```ts
        setFieldErrors(prev => (prev[e.target.name] ? { ...prev, [e.target.name]: "" } : prev));
```
- [ ] **Step 7: Next validates the current step.** Replace `nextStep` (L319-325):
```ts
    const nextStep = () => {
        if (step >= 7) return;
        const errors = validateStep(step);
        if (Object.values(errors).some(Boolean)) {
            setFieldErrors(prev => ({ ...prev, ...errors }));
            toast.error(t("jobForm.fixHighlightedFields"));
            return;
        }
        const next = step + 1;
        setStep(next);
        setMaxStepReached(prev => Math.max(prev, next));
    };
```
And on the Next button (L1041-1046) remove `disabled={step === 1 && !formData.title}` (keep no `disabled` besides nothing — the click now explains itself).
- [ ] **Step 8: Publish validates everything and jumps.** In `handleSubmit` (L399-407) replace the `canPublish` guard block:
```ts
        const allErrors: Record<string, string> = {};
        for (const s of [1, 2, 3]) Object.assign(allErrors, validateStep(s));
        if (!declarationConfirmed) allErrors.declaration = t("jobForm.declarationRequired");
        const firstBad = Object.keys(allErrors).find(k => allErrors[k]);
        if (firstBad) {
            setFieldErrors(prev => ({ ...prev, ...allErrors }));
            goToStep(FIELD_TO_STEP[firstBad] ?? 1);
            toast.error(allErrors[firstBad]);
            return;
        }
```
Then, in the same function's server-error branch (L446-447), jump to the server-reported field:
```ts
        if (result && "error" in result) {
            const field = "field" in result ? (result.field as string | null) : null;
            if (field) {
                setFieldErrors(prev => ({ ...prev, [field]: String(result.error) }));
                goToStep(FIELD_TO_STEP[field] ?? step);
            }
            toast.error(result.error);
        }
```
Finally: on the Publish button (L1048-1050) change `disabled={loading || !canPublish}` to `disabled={loading}` and delete the now-dead `canPublish` memo (L243-252) and its `title=` hint on L1049.
- [ ] **Step 9: Inline field errors + red borders.** Add a tiny renderer near the label-class definitions:
```tsx
    const fieldError = (name: string) =>
        fieldErrors[name] ? <p className="text-xs font-medium text-red-600 mt-1">{fieldErrors[name]}</p> : null;
    const errClass = (name: string) => (fieldErrors[name] ? "border-red-500 focus:border-red-500" : "");
```
Apply to the five required inputs (append `errClass` via `cn(...)` to each existing `className`, and render `{fieldError("…")}` directly under the input):
  - `title` (L591-593), `location` (L611-612), `industry` `<select>` (L616-617) — step 1
  - `employment_type` `<select>` (L645) — step 2
  - `description` textarea (step 3 — locate `name="description"` in the step-3 block)
  - declaration checkbox (L1013-1024 area): `{fieldError("declaration")}` under the label; also clear it in the checkbox's onChange.
- [ ] **Step 10: Verify** — `npm run test -- forms` PASS; `npm run build && npm run lint` PASS.
- [ ] **Step 11: Commit** — `git commit -m "feat(jobs): field-level validation feedback in job wizard (Next/Publish highlight + server field mapping)"`

### Task 7: Confidential company masking

Screenshot 12-07-10. Real leak: recruiter marketplace list prints the company name regardless of `is_confidential` (`recruiter.ts:476`); the detail card hides the name but leaks the website link. Plus: company's own header shows no hint that the job is confidential.

**Files:**
- Modify: `src/lib/actions/recruiter.ts:474-477` (`getAvailableJobsForRecruiter` mapping)
- Modify: `src/components/dashboard/recruiter/recruiter-jobs-list.tsx:339` (list card name)
- Modify: `src/components/dashboard/shared/job-preview-card.tsx:125-130` (website chip)
- Modify: `src/app/(dashboard)/company/jobs/[id]/page.tsx:190-193` (owner header pill)
- Modify: `src/i18n/dictionaries/*.json` (2 keys × 4)
- Test: extend an action test

- [ ] **Step 1: Mask at the source.** `recruiter.ts` mapping:
```ts
    return availableJobs.map(job => ({
        ...job,
        company_name: job.is_confidential ? null : (job.company?.company_name || 'Okänt företag'),
```
- [ ] **Step 2: List card renders a label for null.** At `recruiter-jobs-list.tsx:339` replace `{job.company_name}` with `{job.company_name ?? t("recruiter.confidentialCompany")}` (adapt to the surrounding JSX after Reading it).
- [ ] **Step 3: Website chip honors the flag.** `job-preview-card.tsx:125` → `{!job.is_confidential && company?.website && (`.
- [ ] **Step 4: Owner header pill.** In `[id]/page.tsx` after the company-name div (L191-193):
```tsx
                            {job.is_confidential && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                                    {c.confidentialBadge || "Confidential"}
                                </span>
                            )}
```
- [ ] **Step 5: i18n** (4 dicts): `recruiter.confidentialCompany` — en "Confidential company", sv "Konfidentiellt företag", no "Konfidensielt selskap", da "Fortroligt firma". `company.confidentialBadge` — en "Confidential", sv "Konfidentiell", no "Konfidensiell", da "Fortrolig".
- [ ] **Step 6: Test** — in a new/existing recruiter action test (pattern: `screening.test.ts` fake builder), assert a job row with `is_confidential: true` maps to `company_name: null`. If the mock scaffolding for `getAvailableJobsForRecruiter` (mandates, RPC reconciliation) is disproportionate, test the mapping logic by extracting nothing — instead do the e2e check in Task 11 and say so in the commit body.
- [ ] **Step 7: Commit** — `git commit -m "fix(security): mask confidential company name in recruiter marketplace + hide website; owner sees Confidential pill"`

### Task 8: De-duplicate company job-detail header

Screenshot 12-07-11. Page header (title/status/company/location/date) and the Description tab's `JobPreviewCard` header (title/company/city pill) repeat each other.

**Files:**
- Modify: `src/components/dashboard/shared/job-preview-card.tsx:71-115`
- Modify: `src/app/(dashboard)/company/jobs/[id]/page.tsx:277`

- [ ] **Step 1: Add a `hideHeading` prop.** In `JobPreviewCardProps` add `hideHeading?: boolean;` and destructure it (default `false`) at L71. Wrap the `<h1>` + company-name line (L86-92) and the city pill (L112-116):
```tsx
                    {!hideHeading && (
                        <div className="space-y-1">
                            <h1 ...>{job.title}</h1>
                            ... company line ...
                        </div>
                    )}
```
and `{!hideHeading && job.city && ( ...city pill... )}` — keep work-type, guarantee, website, start date (not duplicated in the page header).
- [ ] **Step 2: Use it.** `[id]/page.tsx:277` → `<JobPreviewCard job={job} variant="company" hideHeading />`. Recruiter/admin usages pass nothing and keep today's full header.
- [ ] **Step 3: Verify** — `npm run build && npm run lint` PASS.
- [ ] **Step 4: Commit** — `git commit -m "fix(ui): company job detail — remove duplicated title/company/location block in Description tab"`

### Task 9: Contact Support form

Screenshot 12-07-04. Replace the `mailto:` link with a small modal form that auto-includes sender name, job title and job URL, and emails support via the existing Resend/SMTP `dispatch` infra.

**Files:**
- Create: `src/lib/actions/support.ts`
- Create: `src/components/dashboard/shared/contact-support-card.tsx`
- Modify: `src/components/dashboard/shared/job-preview-card.tsx:282-294`
- Modify: `src/i18n/dictionaries/*.json` (`support.*` block × 4)
- Test: `src/lib/actions/support.test.ts`

- [ ] **Step 1: Failing test** — `src/lib/actions/support.test.ts` (follow `screening.test.ts` mocking style):
```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const sendUserEmail = vi.fn(async () => ({ ok: true }));
vi.mock("@/lib/email/internal-notifications", () => ({ sendUserEmail: (...a: any[]) => sendUserEmail(...a) }));

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: (table: string) => fakeTable(table),
  }),
}));

let profileRow: any; let jobRow: any;
function fakeTable(table: string) {
  const row = table === "profiles" ? profileRow : jobRow;
  const b: any = { select: () => b, eq: () => b, single: async () => ({ data: row, error: null }) };
  return b;
}

import { sendSupportRequest } from "./support";

beforeEach(() => {
  sendUserEmail.mockClear();
  getUser.mockResolvedValue({ data: { user: { id: "u1", email: "rec@x.se" } } });
  profileRow = { full_name: "Demo Rekryterare", email: "rec@x.se" };
  jobRow = { id: "j1", title: "Lead Generation Specialist" };
});

describe("sendSupportRequest", () => {
  it("rejects unauthenticated calls", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const r = await sendSupportRequest("j1", "help me please with this job");
    expect("error" in r).toBe(true);
    expect(sendUserEmail).not.toHaveBeenCalled();
  });

  it("rejects too-short messages", async () => {
    const r = await sendSupportRequest("j1", "hi");
    expect("error" in r).toBe(true);
  });

  it("sends an email containing sender, job title and job link", async () => {
    const r = await sendSupportRequest("j1", "I have a question about the fee for this assignment.");
    expect(r).toEqual({ success: true });
    const call = sendUserEmail.mock.calls[0][0];
    expect(call.text).toContain("Demo Rekryterare");
    expect(call.text).toContain("Lead Generation Specialist");
    expect(call.text).toContain("/jobs/j1");
  });
});
```
Run: `npm run test -- support` → FAIL (module missing).
- [ ] **Step 2: Action.** `src/lib/actions/support.ts`:
```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { sendUserEmail } from "@/lib/email/internal-notifications";

const SUPPORT_TO = process.env.SUPPORT_EMAIL || process.env.INTERNAL_REVIEW_EMAIL || "";

export async function sendSupportRequest(jobId: string, message: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const trimmed = (message || "").trim();
    if (trimmed.length < 10 || trimmed.length > 2000) {
        return { error: "Message must be between 10 and 2000 characters." };
    }

    const { data: profile } = await supabase
        .from("profiles").select("full_name, email").eq("id", user.id).single();
    const { data: job } = await supabase
        .from("jobs").select("id, title").eq("id", jobId).single();
    if (!job) return { error: "Job not found." };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const jobUrl = `${appUrl}/recruiter/jobs/${job.id}`;
    const senderName = profile?.full_name || "Unknown user";
    const senderEmail = profile?.email || user.email || "unknown";

    const text = [
        `Support request from: ${senderName} <${senderEmail}>`,
        `Job: ${job.title}`,
        `Job URL: ${jobUrl}`,
        ``,
        trimmed,
    ].join("\n");

    if (!SUPPORT_TO) {
        console.error("[sendSupportRequest] SUPPORT_EMAIL/INTERNAL_REVIEW_EMAIL not configured");
        return { error: "Support is not available right now. Please try again later." };
    }

    const ok = await sendUserEmail({
        to: SUPPORT_TO,
        subject: `Support: ${job.title} — ${senderName}`,
        html: text.replace(/\n/g, "<br/>"),
        text,
    });
    if (!ok) return { error: "Could not send your message. Please try again." };
    return { success: true };
}
```
Adjust to `sendUserEmail`'s real signature/return (`src/lib/email/internal-notifications.ts:150`) — the test mock must mirror it. Verify the `profiles` column names (`full_name`, `email`) before finalizing.
- [ ] **Step 3: Run tests** → PASS.
- [ ] **Step 4: UI.** `src/components/dashboard/shared/contact-support-card.tsx` — client component: the existing "Need Help?" card visuals, button opens a modal (same overlay pattern as `approve-job-modal.tsx:64-104`): read-only context lines (user name, job title — passed as props), a `<textarea>`, Cancel/Send buttons calling `sendSupportRequest(jobId, message)`, `toast.success(t("support.sent"))` on success. All strings via `t("support.*")`.
- [ ] **Step 5: Swap it in.** Replace the static box in `job-preview-card.tsx:282-294` with `<ContactSupportCard jobId={job.id} jobTitle={job.title} />` (the card fetches nothing; server data comes from the action).
- [ ] **Step 6: i18n** — new `support` block in all 4 dicts: `needHelp`, `helpText`, `contactSupport`, `messageLabel`, `messagePlaceholder`, `send`, `cancel`, `sent` ("Message sent — we'll get back to you by email"), `sendFailed`. (en/sv/no/da translations, sv e.g. `"sent": "Meddelandet har skickats – vi återkommer via e-post"`.)
- [ ] **Step 7: Verify** — `npm run build && npm run lint && npm run test` PASS.
- [ ] **Step 8: Commit** — `git commit -m "feat(support): in-app contact support form (auto-context + email via dispatch)"`

### Task 10: Admin "Request changes" workflow

Screenshots 12-07-06/07. Admin can send a `pending_approval` job back to `draft` with a message; company gets a notification + banner on the edit page; on re-publish the job reappears as `pending_approval` with a "Resubmitted" chip and admins are notified.

**Files:**
- Create: `supabase/migrations/069_job_change_requests.sql` (verify 069 is the next free number: `ls supabase/migrations | tail`)
- Modify: `src/types/db-types.ts` (jobs row)
- Modify: `src/lib/actions/admin.ts` (new action + `getAdminJobs` select/map)
- Modify: `src/lib/actions/jobs.ts:245-254` (resubmit stamp in `createJob` update branch)
- Create: `src/components/dashboard/admin/request-changes-modal.tsx`
- Modify: `src/app/(dashboard)/admin/jobs/page.tsx:64, 104-114`
- Modify: `src/app/(dashboard)/company/jobs/[id]/edit/page.tsx` (banner)
- Modify: `src/i18n/dictionaries/*.json` (notif + admin + jobForm keys × 4)
- Test: `src/lib/actions/request-job-changes.test.ts`

- [ ] **Step 1: Migration** `069_job_change_requests.sql`:
```sql
-- Admin "request changes" review loop on jobs (pending_approval -> draft -> resubmit).
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS changes_requested_note TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS changes_requested_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS resubmitted_at TIMESTAMPTZ;
```
(Existing table — no new GRANT needed.)
- [ ] **Step 2: Types.** In `db-types.ts` jobs row add:
```ts
  changes_requested_note: string | null;
  changes_requested_at: string | null;
  resubmitted_at: string | null;
```
- [ ] **Step 3: Failing action test** — `src/lib/actions/request-job-changes.test.ts` (screening.test.ts mocking style): mock `requireAdmin` to return a fake supabase whose `jobs` row has `status: "active"` → expect `{ error }` and no update; then `status: "pending_approval"` → expect the update payload to include `status: "draft"` and the note, and `createNotification` (mocked) called once. Run → FAIL (action missing).
- [ ] **Step 4: Action.** In `admin.ts`, next to `requestClientFeeReconfirm` (~L1341) — mirror its structure exactly (auth, guarded update, company lookup, notification):
```ts
// Admin sends a pending job back to the client for edits (screenshots 12-07-06/07).
// pending_approval -> draft + note; client edits the draft and re-publishes,
// which returns it to pending_approval with resubmitted_at set (see createJob).
export async function requestJobChanges(jobId: string, note: string) {
    const { supabase } = await requireAdmin();

    const trimmed = (note || "").trim();
    if (trimmed.length < 5 || trimmed.length > 1000) {
        return { error: "Please describe the requested changes (5–1000 characters)." };
    }

    const { data: job } = await supabase
        .from("jobs")
        .select("id, title, status, company:companies(user_id)")
        .eq("id", jobId)
        .single();
    if (!job) return { error: "Job not found." };
    if (job.status !== "pending_approval") return { error: "Job is not pending approval." };

    const { data: updated, error } = await supabase
        .from("jobs")
        .update({
            status: "draft",
            changes_requested_note: trimmed,
            changes_requested_at: new Date().toISOString(),
            resubmitted_at: null,
        })
        .eq("id", jobId)
        .eq("status", "pending_approval")
        .select("id");
    if (error || !updated?.length) {
        console.error("[requestJobChanges]", error);
        return { error: "Could not request changes. Please try again." };
    }

    const companyUserId = pickFirst(job.company)?.user_id;
    if (companyUserId) {
        await createNotification(companyUserId, {
            titleKey: "notif.jobChangesRequestedTitle",
            bodyKey: "notif.jobChangesRequestedBody",
            params: { jobTitle: job.title },
            link: `/company/jobs/${jobId}/edit`,
        });
    }

    revalidatePath("/admin/jobs");
    revalidatePath("/company/jobs");
    return { success: true };
}
```
Use the same `createNotification` import/lookup helpers `requestClientFeeReconfirm` uses (read it first and copy its exact company→user resolution). Run tests → PASS.
- [ ] **Step 5: Resubmit stamp.** In `jobs.ts` `createJob`, before the insert/update at L252 add:
```ts
    // Re-publishing a draft that had admin-requested changes marks it Resubmitted.
    if (existingDraftId && !isDraft) {
        const { data: prev } = await supabase
            .from("jobs").select("changes_requested_at").eq("id", existingDraftId).single();
        if (prev?.changes_requested_at) {
            (jobPayload as any).resubmitted_at = new Date().toISOString();
        }
    }
```
And after the successful non-draft path (~L264, before revalidate), notify admins of resubmission:
```ts
    if (existingDraftId && (jobPayload as any).resubmitted_at) {
        await notifyAdmins({
            titleKey: "notif.adminJobResubmittedTitle",
            bodyKey: "notif.adminJobResubmittedBody",
            params: { jobTitle: jobPayload.title },
            link: `/admin/jobs`,
        });
    }
```
(Import `notifyAdmins` from `@/lib/notifications/notify-admins` — check how other jobs.ts call sites import it.)
- [ ] **Step 6: Admin modal.** `request-changes-modal.tsx` — clone the overlay pattern from `approve-job-modal.tsx:64-104`: an outline "Request changes" `Button`, modal with required textarea, submit calls `requestJobChanges(jobId, note)`, toasts, closes. i18n keys `admin.requestChangesButton`, `admin.requestChangesTitle`, `admin.requestChangesNoteLabel`, `admin.requestChangesSubmit`, `admin.requestChangesCancel`.
- [ ] **Step 7: Wire into the Approval cell.** `admin/jobs/page.tsx:104-114` — inside the `job.status === "pending_approval"` block render both:
```tsx
                        <div className="space-y-1">
                          <ApproveJobModal jobId={job.id} status={job.status} requiresUplift={...unchanged...} />
                          <RequestChangesModal jobId={job.id} />
                        </div>
```
- [ ] **Step 8: "Resubmitted" chip.** `getAdminJobs` select: add `changes_requested_at, resubmitted_at`; map `resubmittedAt: job.resubmitted_at ?? null`. In the Status cell (page.tsx:64):
```tsx
                    <td className="p-4">
                      <StatusBadge status={job.status} />
                      {job.status === "pending_approval" && job.resubmittedAt && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                          {a.resubmittedBadge}
                        </span>
                      )}
                    </td>
```
- [ ] **Step 9: Company edit-page banner.** In `edit/page.tsx`, the server component already fetches the job (L29-75); when `job.changes_requested_note` render above the form:
```tsx
            {job.changes_requested_note && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <span className="font-semibold">{dict.jobForm.changesRequestedBanner}</span>{" "}
                    {job.changes_requested_note}
                </div>
            )}
```
(Match how that page currently accesses the dictionary; add fetching `changes_requested_note` to its job select if it selects explicit columns.)
- [ ] **Step 10: i18n** (all 4 dicts): `notif.jobChangesRequestedTitle` (en "Changes requested on your job"), `notif.jobChangesRequestedBody` (en "Recruito requested changes to \"{jobTitle}\". Open the draft to update and resubmit."), `notif.adminJobResubmittedTitle` (en "Job resubmitted for approval"), `notif.adminJobResubmittedBody` (en "\"{jobTitle}\" was updated and resubmitted after requested changes."), `admin.resubmittedBadge` (en "Resubmitted"), `admin.requestChanges*` (button "Request changes", title, note label, submit, cancel), `jobForm.changesRequestedBanner` (en "Admin requested changes:"). Swedish/no/da translations for each.
- [ ] **Step 11: Apply migration to the LOCAL stack only** (`supabase db push` or SQL editor on local). **Do NOT touch prod** — prod application is a release step for Henrik (classifier blocks agent prod DB access anyway).
- [ ] **Step 12: Verify** — `npm run test && npm run build && npm run lint` PASS.
- [ ] **Step 13: Commit** — `git commit -m "feat(admin): request-changes review loop (pending_approval->draft->resubmit) with notifications + badges"`

### Task 11: End-to-end verification on the local stack

Run the app against the local Supabase stack (as in previous sessions — NOT `.env.local`, which points at PROD) and verify with the browser preview:

- [ ] Wizard: Employment step shows ONLY Full-time; Salary step shows static "Annual" (no Monthly/Hourly).
- [ ] Wizard: click Next on step 1 with empty title → red border + inline "This field is required" + toast; Publish from step 7 with description cleared → jumps to step 3 with the field highlighted.
- [ ] Publish a job with guarantee 0 → company Jobs list shows "0 months" (not "—"); job detail shows the "Guarantee: 0 months" chip; recruiter Browse card shows the guarantee row.
- [ ] Admin Jobs: no Draft rows; pending job shows "Pending Approval" (translated); "Request changes" → job becomes Draft on company side with notification + edit-page banner → re-publish → admin sees Pending Approval + "Resubmitted" chip and an admin notification.
- [ ] Confidential job: recruiter marketplace shows "Confidential company"; detail card shows no Website chip; company's own header shows the Confidential pill.
- [ ] Company job detail Description tab: no duplicated title/company block.
- [ ] Contact Support: open modal, send message → success toast; with no `RESEND_API_KEY` locally, server log shows the dispatch skip/log line (that is proof of wiring).
- [ ] Full gate: `npm run build && npm run lint && npm run test` all green.
- [ ] Screenshot evidence for the handoff (wizard validation, guarantee 0, admin badge, banner).

### Task 12: Docs

- [ ] Write `Decisions/2026-07-12-launch-scope-fulltime-annual-only.md` (vault root): full-time + annual only for launch; how to re-enable (`ACTIVE_EMPLOYMENT_TYPE_OPTIONS`, restore period select, per-type pricing needed first); request-changes workflow reuses `draft` status.
- [ ] Commit: `git commit -m "docs(vault): ADR — launch scope full-time/annual only + request-changes loop"`

---

## Self-review (done at plan time)

- **Spec coverage:** employment types → T4; salary period + fee accuracy → T5; validation messages (both written findings + imgs 15/16) → T6; guarantee 0 (imgs 05/12/13/14) → T3; raw status key (img 06) → T1; drafts in admin list (img 09) → T2; request changes (imgs 06/07) → T10; contact support (img 04) → T9; confidential (img 10) → T7; duplicate boxes (img 11) → T8. Img 12-07-03 has no annotation → covered by Decision 1 (no action).
- **Type consistency:** `field` returned by `validateJobForm` is consumed in T6 Step 8 with the same name; `ACTIVE_EMPLOYMENT_TYPE_OPTIONS` used in T4 Steps 1–3 consistently; `resubmitted_at`/`changes_requested_*` names match migration ↔ db-types ↔ action ↔ UI.
- **Known soft spots (executor must Read before Edit):** exact JSX at `recruiter-jobs-list.tsx:339`, `formatGuaranteeMonths` helper body, `sendUserEmail` signature, edit-page dictionary access, `requestClientFeeReconfirm`'s company→user lookup. All are called out inline above.
