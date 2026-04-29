# Job Form Simplification + Job Details Preview

**Date:** 2026-04-29  
**Branch:** fix/client-feedback-batch-2  
**Source:** Client email + 5 annotated screenshots

---

## Goals

1. Simplify the job posting form by removing low-value fields and converting free-text inputs to structured dropdowns.
2. Introduce a rich Job Details preview page visible to both companies and recruiters.

---

## 1. Form Field Removals

Remove these fields from the UI only. DB columns are kept (no data loss).

| Field | DB column | Form section |
|-------|-----------|--------------|
| Management responsibility toggle | `management_required` | Section 3 – The Role |
| Application Deadline | `application_deadline` | Section 5 – Recruitment & Screening |
| Background check required | `background_check_required` | Section 6 – Conditions & Other |
| Who will conduct the interview | `interview_conductors` | Section 6 – Conditions & Other |
| Gross/Net salary dropdown | `salary_gross_net` | Section 4 – Salary & Benefits |
| Bonus structure textarea | `bonus_structure` | Section 4 – Salary & Benefits |
| Recruitment Fee chip inside Employment card | UI only | Section 2 – Employment |

---

## 2. Dropdown Upgrades

### 2a. `reporting_to` (Section 3)

Currently: free-text input, hidden behind `management_required` gate.  
New: standalone `<select>` with these options:

- No Reporting Required
- Supervisor
- Manager
- Senior Manager
- Team Lead
- Head / Head of Department
- Director
- Vice President (VP)
- Senior Vice President (SVP)
- Executive (C-Level: CEO, CTO, CFO, etc.)
- Founder / Owner

### 2b. `team_size` (Section 3)

Currently: `integer` number input, hidden behind `management_required` gate.  
New: standalone `<select>` with string range values. **Requires DB migration.**

Options:
- No team management
- 1 - 5
- 6 - 10
- 11 - 20
- 21 - 50
- 51 - 70
- 71 - 100
- 101 - 200
- 201+

**DB migration:** `ALTER TABLE jobs ALTER COLUMN team_size TYPE text USING CASE ...` (maps existing integers to nearest bracket).

### 2c. `working_hours` (Section 6)

Currently: free-text input.  
New: `<select>` with these options:

- Standard Business Hours
- Flexible Hours
- Shift-Based
- Rotational Shifts
- Night Shift
- Weekend Shifts
- Split Shift (e.g., morning + evening)

### 2d. `experience_bracket` → "Experience Requirements" (Section 3)

Currently: exists in DB as `text`, not shown in form.  
New: add as standalone `<select>` in Section 3 between Key Requirements and Description.

Options:
- Fresh Graduate / No Experience
- 0–1 year
- 1–3 years
- 3–5 years
- 5–7 years
- 7–10 years
- 10–15 years
- 15+ years

---

## 3. Section 3 (The Role) — New Layout

Before: Key Requirements → Description → Management responsibility → *[if yes]* Team Size + Reporting To  
After: Key Requirements → **Experience Requirements** → Description → **Team Size** → **Reporting To**

---

## 4. Job Details Preview Page — `JobPreviewCard`

A new shared read-only component rendering all job fields in a structured layout.

### Layout (matches client mockup)

**Header row**
- Job title (large)
- Company name / "Confidential" badge + logo
- Location chips (city, country, work type)
- Website + LinkedIn links
- Desired start date (highlighted)

**Job Overview grid (2×4)**
- Employment type
- Work permits (highlighted if visa sponsorship offered)
- Salary (gross, with period)
- Contract type
- Experience (from `experience_bracket`)
- Language required
- Position type (New / Replacement)
- Open positions

**Two-column row**
- Left: Key Requirements (checklist)
- Right: Hiring Process (num_interviews, assessment_type, technical_test_required)

**Full-width: Key Responsibilities & Requirements**
- Rendered from `description` (rich text / markdown)

**Two-column row**
- Left: Benefits (icon grid from `benefits[]`)
- Right: Screening Questions (numbered list)

**Additional Information footer**
- Industry, Reports To, Working Hours, Team Size, Travel Required, Flexible Hours

**Recruiter-side extras** (shown only on recruiter view)
- Recruiter Earnings card (payout amount)
- "Start Recruiting" CTA (disabled when `current_recruiter_count >= max_recruiters`, with tooltip "No seats left")
- "Save Job" button

### Component location

`rekryteringsplattform/src/components/dashboard/shared/job-preview-card.tsx`

Accepts a `job: Job` prop. Renders differently based on a `variant: "company" | "recruiter"` prop.

### Where it appears

| Surface | How |
|---------|-----|
| Company `/company/jobs/[id]` | Populate the existing "Description" tab content |
| Recruiter `/recruiter/jobs/[id]` | New full page — "Back to Jobs" link, then `JobPreviewCard variant="recruiter"` |

### Recruiter job detail routing

- New page: `src/app/(dashboard)/recruiter/jobs/[id]/page.tsx`
- Fetches job by ID, checks it is active
- Renders `JobPreviewCard variant="recruiter"`
- `recruiter-jobs-list.tsx`: job title / "View Details" link → `/recruiter/jobs/{id}`

---

## 5. i18n

New keys required in all four dictionaries (`en`, `sv`, `no`, `da`):

- `jobForm.experienceRequirements` — label
- `jobForm.experienceOptions.*` — one per option (or inline array)
- `jobForm.reportingToOptions.*`
- `jobForm.teamSizeOptions.*`
- `jobForm.workingHoursOptions.*`
- `jobPreview.*` — all labels used in `JobPreviewCard`

---

## 6. Out of Scope

- No changes to admin side
- No changes to DB columns for removed fields (keep data)
- `salary_gross_net` removed from form but value can default to `"gross"` on save
- `bonus_structure` removed from form; existing saved values preserved in DB
