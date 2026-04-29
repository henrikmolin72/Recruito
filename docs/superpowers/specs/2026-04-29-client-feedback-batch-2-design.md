# Client Feedback Batch 2 — Design

**Date:** 2026-04-29
**Source:** Client screenshots (5 images) flagging UI/UX bugs.

## Scope

Four independent bug fixes, each with a clear root cause and surgical fix.

| # | Symptom | Root cause | Fix location |
|---|---------|-----------|--------------|
| 1 | "Refer a Candidate" button stays active on expired mandates and after submission cap reached | Button rendered unconditionally | `recruiter/mandates/page.tsx` |
| 2 | Login form shows raw "Database error querying schema" | `auth.ts` returns `error.message` directly | `lib/actions/auth.ts` |
| 3 | Duplicate-email check says "you may proceed" for an email that already exists | `/api/candidates/check-duplicate` query scope or case-sensitivity | `api/candidates/check-duplicate/route.ts` |
| 4 | Long AI/recruiter note overflows candidate list card | Text rendered without truncation | `candidate-pipeline.tsx` ListView |

---

## Issue 1 — Refer button gating

**File:** `src/app/(dashboard)/recruiter/mandates/page.tsx` (lines ~220–231).

**Current:**
```tsx
<Link href={`/recruiter/mandates/${mandate.id}/candidates/new`}>
  <Button ...>{r.referCandidate || "Refer a Candidate"}</Button>
</Link>
```

**New:**
```tsx
const isExpired = days !== null && days <= 0;
const capReached = mandate.submitted_count >= mandate.submission_cap;
const blocked = isExpired || capReached;

{blocked ? (
  <Button size="sm" disabled className="...opacity-50">
    {isExpired ? r.expiredLabel : r.capReachedLabel}
  </Button>
) : (
  <Link href={...}><Button>...</Button></Link>
)}
```

**Data dependency:** `getRecruiterMandates()` must return `submitted_count` + `submission_cap` per mandate. Verify in `lib/actions/recruiter.ts`; add to select if missing. Cap field added in commit `8a56b03`.

**i18n keys:** `recruiter.expiredLabel`, `recruiter.capReachedLabel` in all dictionaries.

---

## Issue 2 — Sanitize login error

**File:** `src/lib/actions/auth.ts`.

**Current pattern (lines 29–30, 68–69, 113–114):**
```ts
if (error) return { error: error.message };
```

**Replacement helper:**
```ts
function mapAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Felaktig e-post eller lösenord.";
  if (/email not confirmed/i.test(message)) return "Bekräfta e-post först.";
  if (/rate.*limit|too many/i.test(message)) return "För många försök. Vänta en stund.";
  return "Tjänsten är otillgänglig just nu. Försök igen.";
}
```

Then:
```ts
if (error) {
  console.error("Auth error:", error);
  return { error: mapAuthError(error.message) };
}
```

Apply at all three sites in `auth.ts`. Add EN equivalents and i18n keys.

**Why:** CLAUDE.md §6 — never return raw Supabase/Postgres errors to the client.

---

## Issue 3 — Duplicate email false negative

**File:** `src/app/api/candidates/check-duplicate/route.ts` (verify path).

**Suspected causes (in order of likelihood):**
1. Query scoped by `job_id` → misses duplicates from same recruiter on different jobs.
2. Case-sensitive `eq("email", email)` → `Daniel.X@gmail.com` ≠ `daniel.x@gmail.com`.
3. Scoped by `recruiter_id` → other recruiters' submissions invisible.

**Fix:**
```ts
const normalized = email.trim().toLowerCase();
const { data } = await supabase
  .from("candidates")
  .select("id")
  .ilike("email", normalized)
  .limit(1);
return Response.json({ duplicate: !!data?.length });
```

Match the duplicate-detection rule used in `placements.ts` so check-duplicate and the actual submission action agree.

**Defense-in-depth:** server action `submitCandidate` (in `candidates.ts`) re-runs the same check before insert. On hit → return generic "Kandidaten finns redan registrerad."

---

## Issue 4 — Long note in candidates list

**File:** `src/components/dashboard/company/candidate-pipeline.tsx` ListView (lines 183–215).

**Discovery step:** grep `db-types.ts` for `notes|ai_recommendation|recommendation|comment` columns on `candidates`. Identify the field rendering the long sentence.

**Fix:** wrap with line-clamp:
```tsx
{candidate.ai_recommendation && (
  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
    {candidate.ai_recommendation}
  </p>
)}
```

Tailwind `line-clamp-2` truncates at 2 lines with ellipsis. Full text remains visible on detail page.

If the field originates from an AI prompt that is verbose by design, log a follow-up to cap output length at generation time (separate task).

---

## Files touched

```
src/app/(dashboard)/recruiter/mandates/page.tsx
src/lib/actions/recruiter.ts                        (if cap field missing from select)
src/lib/actions/auth.ts
src/app/api/candidates/check-duplicate/route.ts
src/lib/actions/candidates.ts                       (server-side dup re-check)
src/components/dashboard/company/candidate-pipeline.tsx
src/i18n/dictionaries/sv.json
src/i18n/dictionaries/en.json
src/i18n/dictionaries/<other-locales>.json
```

## Verification

- **Issue 1:** seed an expired mandate → assert button disabled; seed mandate at cap → assert button disabled.
- **Issue 2:** trigger bad credentials → assert UI shows generic message, server log holds raw error.
- **Issue 3:** call check-duplicate with mixed-case email of an existing candidate across a different job → expect `duplicate: true`. Submit anyway → server action blocks.
- **Issue 4:** seed candidate with long `ai_recommendation` → list view shows 2-line clamp.
- `npm run build` in `rekryteringsplattform/` passes (i18n + types).

## Out of scope

- Refactoring `placements.ts` duplicate-detection rules.
- Redesigning the AI recommendation prompt.
- Adding admin UI to edit submission caps (already shipped in `8a56b03`).

## Risks

- **i18n drift:** new keys must land in every dictionary or build fails (CLAUDE.md §6).
- **placements.ts is load-bearing** — server-side dup re-check must not regress existing duplicate semantics. Pin behavior with a test before changing.
