# Client Review - Implementation Plan

## Files to modify:
- `src/components/layout/recruitment-calculator.tsx` — Calculator component
- `src/app/(dashboard)/company/jobs/new/create-job-form.tsx` — Create job form (738 lines)
- `src/lib/validation/forms.ts` — Zod schemas
- `src/lib/job-form-options.ts` — Dropdown/select options
- `src/types/db-types.ts` — TypeScript interfaces
- `src/i18n/dictionaries/en.json` — English translations
- `src/i18n/dictionaries/sv.json` — Swedish translations (+ no.json, da.json)

---

## 1. CALCULATOR — Currency & Salary Range (SEK)

**File:** `recruitment-calculator.tsx`

The client wants the calculator in **SEK**, not EUR. We need to revert our EUR change and convert all values from EUR to SEK annual salaries.

Changes:
- **Revert currency** from `€`/`EUR` back to `SEK`/`kr`
- **Convert commission table** from EUR → SEK (multiply by ~11.5):
  - 20,000 EUR → 250,000 SEK, 25,000 → 300,000, 30,000 → 350,000, ... 120,000 → 1,400,000 SEK
  - Commission percentages stay the same (11% → 6.25%)
- **Update slider range**: 250,000 – 1,500,000 SEK (annual)
- **Update slider step**: 10,000 or 25,000 SEK
- **Update default salary**: 400,000 SEK (~35,000 EUR, entry-level)
- **Convert MIN_FEE**: 3,500 EUR → 40,000 SEK
- **Update `fmt()` locale** to `sv-SE` (already correct)

## 2. CALCULATOR — Guarantee Options

The client says: fix guarantee at 2 months, remove 3 months or write "(3 months - Higher Fee)".

Changes:
- Keep options: 0, 1, 2 months as-is
- Change 3 months option label to: `3 mån (Högre avgift)` / `3 mo. (Higher fee)`
- OR remove the 3 months option entirely (we'll keep it with the warning label, since the recruitment form section also mentions possibly adding 3 months)

## 3. CALCULATOR — Level & Job Function % Display

The client asks: "Should we display the %?" and says "I have added percentages based on my assumptions. Please review."

Changes:
- **Keep the `+X%` display** in Level and Job Function dropdowns (it's already there)
- Review and adjust percentage values if needed (the current values look reasonable)

---

## 4. FORM — Team Structure (Step 3)

**Replace** the current freetext "Teamstruktur" textarea with structured fields:

- **Management Responsibility**: Yes/No toggle (radio or checkbox)
- If Yes, show:
  - **Team Size**: Numeric input (e.g., 5)
  - **Reporting to**: Free text input (with placeholder: "e.g. Director, GM, Manager")

Update:
- `formData` state: add `management_required`, `team_size`, `reporting_to`
- Zod schema: add corresponding fields
- DB types: add to Job interface
- **Note**: Supabase table needs new columns: `management_required (boolean)`, `team_size (integer)`, `reporting_to (text)`

## 5. FORM — Remove Duplicated Fields & Add Key Requirements (Step 3)

**Remove** these fields from Step 3 (they duplicate info in the Job Description):
- Tools / Technologies (`tools_technologies`)
- Min. erfarenhet (år) (`min_years_experience`)
- Krav på utbildning (`required_degree`)
- Obligatoriska certifieringar (`required_certifications`)
- Tekniska krav (`required_technical_skills`)
- Branscherfarenhet (`required_industry_experience`)

**Add** at the **start** of Step 3, before Job Description:
- **Key Requirements** (1–5 dynamic text fields, similar pattern to screening questions)
  - Label: "Key Requirements — without which a candidate will not be considered"
  - "Key Requirement 1", "Key Requirement 2", etc.
  - Add/remove buttons (min 1, max 5)

Update:
- `formData` state: remove the 6 fields above, add `key_requirements` array
- Zod schema: remove old fields, add `key_requirements: z.array(z.string().trim().max(500)).min(1).max(5)`
- DB types: add `key_requirements: string[]`
- Server action: update field mapping
- **Note**: Supabase table needs new column: `key_requirements (text[])`, old columns can stay (nullable)

## 6. FORM — Language Requirements (Step 3)

**Replace** the single language + level fields with a multi-language selector:

- Dropdown of European languages + English (predefined list)
- Can add up to 3 languages
- Each language has a level selector (basic → native)
- Add/remove pattern (like screening questions)

New options constant: `EUROPEAN_LANGUAGES` = ["English", "Swedish", "Norwegian", "Danish", "Finnish", "German", "French", "Spanish", "Italian", "Dutch", "Polish", "Portuguese", "Czech", "Romanian", "Hungarian", "Greek", "Bulgarian", "Croatian", "Slovak", "Slovenian", "Lithuanian", "Latvian", "Estonian"]

Update:
- `formData` state: replace `required_language`/`required_language_level` with `language_requirements` array of `{language, level}`
- Zod schema: update accordingly
- DB types: update to `language_requirements: {language: string, level: string}[] | null`
- **Note**: Supabase column: `language_requirements (jsonb)`

## 7. FORM — Salary Period Label (Step 4)

Change the "yearly" option label from "År" to **"År (rekommenderat)"** / **"Annual (recommended)"**.

Update:
- `SALARY_PERIOD_LABELS` in create-job-form.tsx: `yearly: "År (rekommenderat)"`
- i18n dictionaries if needed

## 8. FORM — Recruitment Section Cleanup (Step 5)

**Remove** (hide from client, keep in backend):
- Recruitment fee % display (internal)
- Max recruiters field (internal) — keep default value of 5 in hidden field
- "Manuellt arvode (EUR, min 2 000)" field (internal)
- Text "(max 2 mån)" from guarantee label

**Keep visible:**
- Application deadline — add helper text: "1 month recommended from publishing date"
- Guarantee period (warranty) — label: "Garantiperiod" (no max text)
  - Options: 1 month, 2 months, 3 months (to match calculator)

Update:
- Remove 3 fields from Step 5 UI (keep hidden inputs or set defaults in handleSubmit)
- Guarantee options: add 3 months
- Zod schema: update `guarantee_period_months` to allow 0-3
- Update guarantee label, add deadline helper text

## 9. FORM — Screening Section Changes (Step 6)

**Replace** "Intervjutyp" (online/onsite/both) with:
- **Number of interviews**: Select dropdown (1, 2, 3, 4)
- **Who will conduct the interview**: Free text input (placeholder: "e.g. HR, GM, Director")

Update:
- `formData` state: replace `interview_type` with `num_interviews`, `interview_conductors`
- Zod schema: remove `interview_type`, add new fields
- DB types: update
- **Note**: Supabase table needs columns: `num_interviews (integer)`, `interview_conductors (text)`

---

## 10. UI — i18n: Form Not Fully Translated

The entire `create-job-form.tsx` has **hardcoded Swedish** strings — labels, placeholders, step titles, button text. When English is selected, these remain in Swedish.

Fix approach:
- The form needs to accept a dictionary prop (or use a dictionary context/hook)
- Add all form labels/placeholders to the i18n dictionaries (en.json, sv.json, no.json, da.json)
- Replace every hardcoded string with dictionary lookups
- This includes: STEPS array, label texts, placeholders, button labels, helper texts, and all the label maps (BENEFIT_LABELS, WORK_TYPE_LABELS, etc.)

This is the **largest change** — every string in the 738-line form needs internationalization.

## 11. UI — "Complete & Publish" Button Always Visible

The button currently only renders on step 8. The client wants it always visible.

Fix:
- Add a persistent "Complete & Publish" button that's always visible (perhaps in a sticky footer or alongside the step navigation)
- On steps 1-7, clicking it could either jump to step 8 or submit directly (if all required fields are filled)
- Alternative: Make it a secondary/outlined button on steps 1-7 that jumps to the final step, and a primary button on step 8

## 12. UI — Form Submission Error

Need to investigate the actual error. Possible causes:
- Zod validation failing on removed/renamed fields
- Server action missing required fields
- Supabase insert failing due to schema mismatch
- Will debug after implementing changes and test submit flow

## 13. UI — Clickable Section Navigation

Make the step indicators (1, 2, 3...8) clickable buttons for direct navigation.

Changes:
- Wrap each step indicator in a `<button>` element
- Add `onClick={() => setStep(s.id)}` handler
- Add cursor-pointer styling
- Optionally: only allow navigation to completed or current steps (prevent skipping ahead)

---

## Implementation Order

1. **Calculator** (steps 1-3) — isolated component, quick win
2. **Step navigation buttons** (step 13) — small change
3. **Recruitment section cleanup** (step 8) — remove fields
4. **Screening changes** (step 9) — replace interview type
5. **Remove duplicated fields + add key requirements** (step 5) — step 3 overhaul
6. **Team structure** (step 4) — step 3 addition
7. **Language requirements** (step 6) — step 3 enhancement
8. **Salary period label** (step 7) — one-line change
9. **Publish button visibility** (step 11) — UI tweak
10. **i18n full translation** (step 10) — largest change, do last
11. **Form submission debug** (step 12) — test after all changes
12. **Schema & type updates** throughout
