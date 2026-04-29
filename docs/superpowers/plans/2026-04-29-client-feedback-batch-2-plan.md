# Client Feedback Batch 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four client-reported UI/UX bugs: refer-button gating on expired/capped mandates, sanitize raw Supabase login errors, fix duplicate-email cross-job false negative, and truncate long candidate notes in company list.

**Architecture:** Surgical edits across 6 files + i18n dictionaries. No new modules. Each task = one bug, independently verifiable.

**Tech Stack:** Next.js 15 App Router, React Server Components, Supabase, Tailwind, TypeScript.

**Spec:** `docs/superpowers/specs/2026-04-29-client-feedback-batch-2-design.md`

---

## File Map

| File | Responsibility | Change |
|------|---------------|--------|
| `src/lib/actions/recruiter.ts` | Add `max_candidates` + `application_deadline` to mandate query / return | Modify |
| `src/app/(dashboard)/recruiter/mandates/page.tsx` | Gate refer button by expiry + cap | Modify |
| `src/lib/actions/auth.ts` | Map raw Supabase errors to safe messages | Modify |
| `src/app/api/candidates/check-duplicate/route.ts` | Expand duplicate scope beyond single job | Modify |
| `src/lib/actions/candidates.ts` | Defense-in-depth cross-job dup check | Modify |
| `src/components/dashboard/company/candidate-pipeline.tsx` | Line-clamp long note in ListView | Modify |
| `src/i18n/dictionaries/sv.json`, `en.json` | New keys: expiredLabel, capReachedLabel, generic auth error | Modify |

---

## Task 1: Refer button gating on expired/capped mandates

**Files:**
- Modify: `src/lib/actions/recruiter.ts:508-568` (`getRecruiterMandates`)
- Modify: `src/app/(dashboard)/recruiter/mandates/page.tsx:220-231`
- Modify: `src/i18n/dictionaries/sv.json`, `en.json`

### Step 1.1: Expand `getRecruiterMandates` to return cap data

- [ ] Edit `src/lib/actions/recruiter.ts`. In `getRecruiterMandates`, add `max_candidates` and `application_deadline` to the `job:jobs(...)` select (already includes `application_deadline`; add `max_candidates`):

```ts
job:jobs(
  id,
  title,
  description,
  location,
  industry,
  employment_type,
  salary_min,
  salary_max,
  salary_currency,
  fee_percentage,
  status,
  published_at,
  application_deadline,
  max_candidates,
  company:companies(company_name)
),
```

- [ ] In the `.map(...)` block, expose two new fields on the returned object:

```ts
return mandates.map((mandate: any) => ({
    id: mandate.id,
    job_id: mandate.job?.id,
    title: mandate.job?.title || "Okänt jobb",
    // ...existing fields...
    application_deadline: mandate.job?.application_deadline,
    published_at: mandate.job?.published_at,
    max_candidates: mandate.job?.max_candidates ?? 8,
    submitted_count: (mandate.candidates || []).length,
    candidates: mandate.candidates?.map((c: any) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        status: c.status
    })) || []
}));
```

### Step 1.2: Add i18n keys

- [ ] Edit `src/i18n/dictionaries/sv.json`. Under `recruiter`, add:

```json
"expiredLabel": "Utgånget",
"capReachedLabel": "Tak uppnått",
```

- [ ] Edit `src/i18n/dictionaries/en.json`. Under `recruiter`, add:

```json
"expiredLabel": "Expired",
"capReachedLabel": "Cap reached",
```

- [ ] Repeat for any other locale files in `src/i18n/dictionaries/` (build will tell you which).

### Step 1.3: Gate the button render

- [ ] Edit `src/app/(dashboard)/recruiter/mandates/page.tsx`. Replace the block at lines 220–231 with:

```tsx
{/* Refer a Candidate */}
<td className="px-4 py-3 text-center">
  {(() => {
    const isExpired = days !== null && days <= 0;
    const cap = mandate.max_candidates ?? 8;
    const submitted = mandate.submitted_count ?? 0;
    const capReached = submitted >= cap;
    const blocked = isExpired || capReached;

    if (blocked) {
      return (
        <Button
          size="sm"
          disabled
          className="gap-1.5 whitespace-nowrap text-xs opacity-60 cursor-not-allowed"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {isExpired
            ? (r.expiredLabel || "Expired")
            : (r.capReachedLabel || "Cap reached")}
        </Button>
      );
    }

    return (
      <Link href={`/recruiter/mandates/${mandate.id}/candidates/new`}>
        <Button
          size="sm"
          className="gap-1.5 bg-brand-600 hover:bg-brand-700 text-white whitespace-nowrap text-xs"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {r.referCandidate || "Refer a Candidate"}
        </Button>
      </Link>
    );
  })()}
</td>
```

### Step 1.4: Verify

- [ ] In `rekryteringsplattform/`, run:

```bash
npm run build
```

Expected: build succeeds, no i18n key errors, no type errors.

- [ ] Manual: in dev, view `/recruiter/mandates`. Confirm:
  - Mandate with `application_deadline` in the past → button shows "Utgånget/Expired", disabled.
  - Mandate at cap (e.g. 8 of 8 submitted) → button shows "Tak uppnått/Cap reached", disabled.
  - Active mandate under cap → button is the active blue "Refer a Candidate".

### Step 1.5: Commit

```bash
git add rekryteringsplattform/src/lib/actions/recruiter.ts \
        rekryteringsplattform/src/app/\(dashboard\)/recruiter/mandates/page.tsx \
        rekryteringsplattform/src/i18n/dictionaries/
git commit -m "fix: gate refer button on expired/capped mandates"
```

---

## Task 2: Sanitize raw login error

**Files:**
- Modify: `src/lib/actions/auth.ts` (lines ~24–30, 56–69, 101–114)

### Step 2.1: Add error-mapping helper

- [ ] At top of `src/lib/actions/auth.ts` (after imports, before first action), add:

```ts
function mapAuthErrorMessage(message: string | undefined): string {
  if (!message) return "Tjänsten är otillgänglig just nu. Försök igen.";
  if (/invalid login credentials/i.test(message)) return "Felaktig e-post eller lösenord.";
  if (/email not confirmed/i.test(message)) return "Bekräfta din e-post först.";
  if (/rate.*limit|too many|429/i.test(message)) return "För många försök. Vänta en stund och försök igen.";
  return "Tjänsten är otillgänglig just nu. Försök igen.";
}
```

### Step 2.2: Replace raw error returns in login

- [ ] In the `login` action, replace:

```ts
if (error) {
    return { error: error.message };
}
```

with:

```ts
if (error) {
    console.error("Auth login error:", error);
    return { error: mapAuthErrorMessage(error.message) };
}
```

### Step 2.3: Apply same pattern to register/recruiter signup

- [ ] In the company signup action (around line 68), replace:

```ts
if (error) {
    return { error: error.message };
}
```

with:

```ts
if (error) {
    console.error("Auth signup error:", error);
    return { error: mapAuthErrorMessage(error.message) };
}
```

- [ ] In the recruiter signup action (around line 113), apply the same change.

### Step 2.4: Verify

- [ ] Build: `npm run build` in `rekryteringsplattform/`. Expected: passes.
- [ ] Manual: log in with a non-existent account → UI shows "Felaktig e-post eller lösenord." Server log shows raw Supabase error.
- [ ] Manual: if you can reproduce a schema/database error, confirm UI shows generic "Tjänsten är otillgänglig just nu. Försök igen." (no "Database error querying schema" leakage).

### Step 2.5: Commit

```bash
git add rekryteringsplattform/src/lib/actions/auth.ts
git commit -m "fix: sanitize raw Supabase auth errors before returning to client"
```

---

## Task 3: Fix duplicate-email cross-job false negative

**Files:**
- Modify: `src/app/api/candidates/check-duplicate/route.ts`
- Modify: `src/lib/actions/candidates.ts` (defense-in-depth)

### Step 3.1: Expand check-duplicate scope

- [ ] Edit `src/app/api/candidates/check-duplicate/route.ts`. The current query (lines 50–58) is scoped to `job_id` of the current mandate, missing duplicates from other jobs the same recruiter (or any recruiter) has submitted. Replace the mandate lookup + same-job query block with a recruiter-scoped query (preferring email+linkedin OR-match across all of the recruiter's candidates):

```ts
// Verify the mandate exists and (for non-admin) belongs to the recruiter.
let mandateQuery = admin.from("job_mandates").select("job_id").eq("id", mandateId);
if (!isAdmin) mandateQuery = mandateQuery.eq("recruiter_id", recruiterId as string);
const { data: mandate } = await mandateQuery.single();
if (!mandate) return NextResponse.json({ error: "Mandate not found" }, { status: 404 });

// Fetch all candidates ever submitted (scoped to this recruiter unless admin)
// so duplicates from other jobs are also caught.
let dupQuery = admin.from("candidates").select("email, linkedin_url");
if (!isAdmin && recruiterId) {
    dupQuery = dupQuery.eq("recruiter_id", recruiterId);
}
const { data: candidatesRows } = await dupQuery;

const duplicate = (candidatesRows || []).some((c: any) => {
    const ce = normalize(c.email);
    const cl = normalize(c.linkedin_url);
    return (email && ce === email) || (linkedIn && cl === linkedIn);
});

return NextResponse.json({ duplicate });
```

> Note: the existing `normalize()` helper already lowercases + trims, so case-sensitivity is not the issue — scope is. Keep `normalize` as-is.

### Step 3.2: Add server-side duplicate check on submit

- [ ] Open `src/lib/actions/candidates.ts`. Locate the candidate-creation action used by the submission form (function name likely `createCandidate` or `submitCandidate` — find via grep `from("candidates").*insert` or `createCandidate`). Inside that action, **before** the insert, add:

```ts
// Defense-in-depth: re-check duplicate at server-action level using
// the same scope as /api/candidates/check-duplicate.
{
    const normalizedEmail = email?.trim().toLowerCase() || null;
    const normalizedLinkedIn = linkedinUrl?.trim().toLowerCase() || null;

    if (normalizedEmail || normalizedLinkedIn) {
        const { data: existingForRecruiter } = await supabase
            .from("candidates")
            .select("id, email, linkedin_url")
            .eq("recruiter_id", recruiter.id);

        const isDuplicate = (existingForRecruiter || []).some((row: any) => {
            const re = row.email?.trim().toLowerCase() || null;
            const rl = row.linkedin_url?.trim().toLowerCase() || null;
            return (
                (normalizedEmail && re === normalizedEmail) ||
                (normalizedLinkedIn && rl === normalizedLinkedIn)
            );
        });

        if (isDuplicate) {
            return { error: "Kandidaten finns redan registrerad." };
        }
    }
}
```

> Adapt variable names (`email`, `linkedinUrl`, `recruiter.id`) to match what the function already has. If the action uses validated form data (`parsed.data.email`, `parsed.data.linkedin_url`), use those.

### Step 3.3: Verify

- [ ] Build: `npm run build`. Expected: passes.
- [ ] Manual or scripted test:
  1. As recruiter A, submit candidate with email `daniel.andersson.cv@gmail.com` to Job 1.
  2. As same recruiter A, navigate to "Refer a Candidate" for Job 2. Enter the same email. Click "Verify Candidate".
  3. Expected: status flips to `blocked`; UI shows "Candidate already registered. Submission blocked." (existing copy).
  4. Manually skip the verify step and submit anyway → server action returns `error: "Kandidaten finns redan registrerad."`.
- [ ] Confirm same flow works for LinkedIn URL match.

### Step 3.4: Commit

```bash
git add rekryteringsplattform/src/app/api/candidates/check-duplicate/route.ts \
        rekryteringsplattform/src/lib/actions/candidates.ts
git commit -m "fix: catch duplicate candidates across all recruiter jobs (was scoped to single job)"
```

---

## Task 4: Truncate long note in company candidates list

**Files:**
- Modify: `src/components/dashboard/company/candidate-pipeline.tsx` (ListView, lines 188–213)

### Step 4.1: Identify the note field

- [ ] Run:

```bash
grep -nE "ai_recommendation|recruiter_notes|recommendation|notes\b|ai_summary" \
  /Users/henrikmolin/Desktop/Recruito/rekryteringsplattform/src/types/db-types.ts | head
```

Identify the column on `candidates` that stores the long sentence (most likely `ai_recommendation`, `recruiter_notes`, or `notes`). Use that field name in the next step. If multiple plausible candidates exist, query the actual DB row for the candidate shown in the screenshot (Johan Nilsson) and inspect which column has the value.

### Step 4.2: Render with line-clamp in ListView

- [ ] Edit `src/components/dashboard/company/candidate-pipeline.tsx`. Inside the `ListView` component, at the existing `<div className="flex-1 min-w-0">` block (after the meta row at line 203), add a clamped paragraph:

```tsx
<div className="flex-1 min-w-0">
  <div className="flex items-center gap-3">
    <h3 className="font-semibold">{candidate.first_name} {candidate.last_name}</h3>
    <StatusBadge status={candidate.status} />
  </div>
  <p className="text-sm text-muted-foreground">{candidate.current_title || t("common.noTitle")}</p>
  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-muted-foreground">
    {/* ...existing meta spans unchanged... */}
  </div>
  {candidate.ai_recommendation && (
    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
      {candidate.ai_recommendation}
    </p>
  )}
</div>
```

> Replace `candidate.ai_recommendation` with the actual field name discovered in Step 4.1.

- [ ] Verify Tailwind has `line-clamp` plugin enabled. Check `tailwind.config.{js,ts}` for `@tailwindcss/line-clamp` in plugins. If absent (Tailwind ≥ 3.3 includes it by default), no action needed; otherwise add the plugin.

### Step 4.3: Verify

- [ ] Build: `npm run build`. Expected: passes.
- [ ] Manual: as a company user, view `/company/candidates` in list view. A candidate with a long note should display the first ~2 lines followed by ellipsis. Full note still visible on the candidate detail page (no change there).

### Step 4.4: Commit

```bash
git add rekryteringsplattform/src/components/dashboard/company/candidate-pipeline.tsx
git commit -m "fix: clamp long candidate note to 2 lines in company list"
```

---

## Task 5: Final verification

- [ ] In `rekryteringsplattform/`, run a clean build:

```bash
npm run build
```

Expected: passes with zero type errors and zero missing-i18n-key errors.

- [ ] Walk all four scenarios end-to-end against the dev server:
  1. Expired mandate → button disabled, label "Utgånget/Expired".
  2. Mandate at cap → button disabled, label "Tak uppnått/Cap reached".
  3. Login with bad credentials → generic error in UI; raw error in server log only.
  4. Duplicate email across jobs → blocked state shown.
  5. Long note candidate → 2-line clamp.

- [ ] Push branch / open PR with reference to spec doc and image-by-image evidence in the PR description.

---

## Out of Scope

- Refactoring `placements.ts` duplicate-detection rules (CLAUDE.md §6: load-bearing, do not touch without pinning test).
- Redesigning the AI recommendation prompt (separate task if note length is a generation problem).
- Admin UI for editing submission caps (already shipped in `8a56b03`).

## Risks

- **i18n drift:** missing keys in any dictionary fail the build. Add `expiredLabel`, `capReachedLabel` to every dictionary file.
- **Field-name guess in Task 4:** `ai_recommendation` is a guess — Step 4.1 must confirm the actual column before editing.
- **Cross-job duplicate scope change (Task 3):** widening the scope from same-job to recruiter-wide may surface duplicates the recruiter expected to be allowed. If product wants per-job dup checks instead, scope back via additional flag — but the screenshot evidence implies cross-job is the desired behavior.
