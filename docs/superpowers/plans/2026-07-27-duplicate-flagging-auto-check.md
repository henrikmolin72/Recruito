# Duplicate-Flagging Auto-Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Recruito's duplicate protection flag automatically — a candidate already presented for the same job (by ANY recruiter) is flagged the moment the recruiter enters the email/LinkedIn, without clicking a button, and cannot be submitted.

**Architecture:** The server-side block already exists and is authoritative (`createCandidateExtended` queries the job's candidates via the admin client — no recruiter filter — and rejects email/LinkedIn matches). This plan closes the UX + coverage gap: auto-run the existing pre-check on field blur, include LinkedIn in the pre-check, gate the submit button on a flagged duplicate, and pin the server block with regression tests. No schema changes, no new endpoints, no new i18n keys.

**Tech Stack:** Next.js App Router (server actions), Supabase, Vitest, existing `/api/candidates/check-duplicate` route.

---

## What already exists (do NOT rebuild)

| Piece | Where | Behavior |
|---|---|---|
| Server-side same-job block | `rekryteringsplattform/src/lib/actions/candidates-extended.ts:157-199` | Non-draft, email OR LinkedIn match, job-wide via admin client → cross-recruiter. Returns `"A candidate with this email or LinkedIn URL has already been presented for this job."` |
| Pre-check API | `rekryteringsplattform/src/app/api/candidates/check-duplicate/route.ts` | Auth + rate-limited; collapses cross-recruiter reasons to generic `{duplicate: true}` (anti-enumeration — keep this). Accepts `email` AND `linkedin_url`. |
| Manual "Verify Candidate" button | `rekryteringsplattform/src/components/dashboard/recruiter/candidate-submission-form.tsx:225-242, 440-465` | Email-only, must be clicked, result not enforced at submit. |
| i18n keys | `verifyButton` / `verifyNotFound` / `verifyAlreadyExists` at line ~949-951 in all 4 dictionaries (`en`, `sv`, `no`, `da`) | Already translated — reuse `verifyAlreadyExists` for the submit gate. |

The only path to a non-draft candidate row is `createCandidateExtended` (drafts are promoted through it on Present), so the server boundary is single and already protected.

## Gaps this plan closes

1. **Not automatic** — check runs only on button click. → auto-run on email/LinkedIn blur.
2. **Pre-check misses LinkedIn** — form sends email only; server blocks on LinkedIn too, so the recruiter finds out only after filling the whole form. → send `linkedin_url` in the pre-check.
3. **Flag not enforced client-side** — a recruiter can ignore the red flag, fill 6 sections, and hit Present. → gate `handleSubmit` on `verifyStatus === "blocked"`.
4. **Zero test coverage on the block** — the advertised core feature has no regression guard. → pinning tests.

## Out of scope (deliberate)

- Admin audit log of blocked duplicate attempts (nothing requested it — YAGNI).
- Fuzzy identity matching (gmail dot/alias tricks, phone) — exact normalized email/LinkedIn is the existing contract.
- Localizing server-action error strings — server actions return hardcoded strings across the codebase; not this plan's job.
- No migration, no dictionary edits (reminder: the dictionaries contain duplicate JSON keys — never round-trip them through `json.dump`).

---

### Task 0: Branch

- [ ] **Step 1: Create the working branch**

```bash
cd /Users/henrikmolin/Desktop/Recruito && git checkout -b feature/duplicate-flag-autocheck
```

Expected: `Switched to a new branch 'feature/duplicate-flag-autocheck'`

---

### Task 1: Pin the server-side duplicate block with regression tests

**Files:**
- Create: `rekryteringsplattform/src/lib/actions/candidates-extended-duplicate.test.ts`
- Reference (read-only): `rekryteringsplattform/src/lib/actions/candidates-extended.ts:157-199`, `rekryteringsplattform/src/lib/actions/candidates-extended-cap.test.ts` (mock pattern being mirrored)

These are characterization tests: the logic already exists, so they must pass immediately. If any fails, STOP — that is a real bug in the shipped block; report it before continuing.

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Pinning tests for createCandidateExtended's same-job duplicate block — the
// server boundary behind "Recruito flags automatically if a candidate has
// already been presented for the same job, regardless of recruiter". The block
// queries the job's candidates via the ADMIN client with no recruiter filter,
// so another recruiter's submission must trigger it too. Mocks mirror
// candidates-extended-cap.test.ts, extended past the cap and required-fields
// gates down to the duplicate check and (for the negative case) the insert.
// ---------------------------------------------------------------------------

const DUPLICATE_ERROR = {
    error: "A candidate with this email or LinkedIn URL has already been presented for this job.",
};
// The negative test proves the duplicate gate was PASSED by reaching the
// (stubbed, deterministically failing) insert.
const INSERT_STUB_ERROR = { error: "Något gick fel. Försök igen." };

// Existing candidates on the SAME job. recruiter_id is included only to
// document that these rows belong to a DIFFERENT recruiter — the block never
// filters on it.
let existingCandidates: Array<{
    id: string;
    recruiter_id: string;
    email: string | null;
    linkedin_url: string | null;
    status: string;
}> = [];

function makeClient() {
    return {
        auth: { getUser: () => Promise.resolve({ data: { user: { id: "U" } } }) },
        from(table: string) {
            return {
                select: () => ({
                    eq: () => ({
                        single: () => {
                            if (table === "job_mandates")
                                return Promise.resolve({ data: { job_id: "J", recruiter_id: "R" }, error: null });
                            if (table === "recruiters")
                                return Promise.resolve({ data: { id: "R" }, error: null });
                            if (table === "jobs")
                                return Promise.resolve({
                                    data: { screening_questions: [], status: "active", max_candidates: 8 },
                                    error: null,
                                });
                            return Promise.resolve({ data: null, error: null });
                        },
                    }),
                }),
                // Reached only when the duplicate gate passes: stubbed insert
                // error stops the action before notifications / AI eval.
                insert: () => ({
                    select: () => ({
                        single: () => Promise.resolve({ data: null, error: { message: "stub" } }),
                    }),
                }),
            };
        },
    };
}

function makeAdminClient() {
    return {
        from(table: string) {
            return {
                select: (cols?: string) => ({
                    eq: () => {
                        if (table === "jobs" && cols === "id, company_id") {
                            return {
                                single: () =>
                                    Promise.resolve({ data: { id: "J", company_id: "C" }, error: null }),
                            };
                        }
                        if (table === "jobs") {
                            // select("id").eq("company_id", ...) — company job list
                            return Promise.resolve({ data: [{ id: "J" }], error: null });
                        }
                        // candidates: the cap query selects "status"; the duplicate
                        // query selects the identity columns.
                        const rows = (cols || "").includes("email")
                            ? existingCandidates
                            : existingCandidates.map((c) => ({ status: c.status }));
                        return Promise.resolve({ data: rows, error: null });
                    },
                    in: () => Promise.resolve({ data: [], error: null }),
                }),
            };
        },
    };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: () => makeClient() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => makeAdminClient() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("REDIRECT"); } }));

const { createCandidateExtended } = await import("./candidates-extended");

// Complete, presentable submission — passes getMissingRequiredFields so the
// flow reaches the duplicate gate (screening_questions is [] in the job mock).
function fd(overrides: Record<string, string> = {}) {
    const f = new FormData();
    f.set("first_name", "Test");
    f.set("last_name", "Candidate");
    f.set("email", "Dup@Example.com"); // mixed case — the block must normalize
    f.set("employment_status", "employed");
    f.set("employment_reason", "Open to new roles");
    f.set("notice_period", "1_month");
    f.set("first_contact_date", "2026-07-01");
    f.set("contact_method", "phone");
    f.set("current_salary", "40000");
    f.set("expected_salary", "45000");
    for (const [k, v] of Object.entries(overrides)) f.set(k, v);
    return f;
}

describe("createCandidateExtended — same-job duplicate block (cross-recruiter)", () => {
    it("blocks when ANOTHER recruiter already presented the same email on this job", async () => {
        existingCandidates = [
            {
                id: "X",
                recruiter_id: "OTHER_RECRUITER",
                email: "dup@example.com",
                linkedin_url: null,
                status: "under_client_review",
            },
        ];
        const res = await createCandidateExtended("M1", fd());
        expect(res).toEqual(DUPLICATE_ERROR);
    });

    it("blocks on LinkedIn URL match even when the email differs", async () => {
        existingCandidates = [
            {
                id: "X",
                recruiter_id: "OTHER_RECRUITER",
                email: "other@example.com",
                linkedin_url: "https://linkedin.com/in/dup",
                status: "under_client_review",
            },
        ];
        const res = await createCandidateExtended(
            "M1",
            fd({ email: "new@example.com", linkedin_url: "HTTPS://linkedin.com/in/dup " }),
        );
        expect(res).toEqual(DUPLICATE_ERROR);
    });

    it("blocks even when the earlier same-job candidate was rejected", async () => {
        existingCandidates = [
            {
                id: "X",
                recruiter_id: "OTHER_RECRUITER",
                email: "dup@example.com",
                linkedin_url: null,
                status: "recruito_rejected",
            },
        ];
        const res = await createCandidateExtended("M1", fd());
        expect(res).toEqual(DUPLICATE_ERROR);
    });

    it("does NOT block on a draft with the same email (drafts are invisible)", async () => {
        existingCandidates = [
            {
                id: "X",
                recruiter_id: "OTHER_RECRUITER",
                email: "dup@example.com",
                linkedin_url: null,
                status: "draft",
            },
        ];
        const res = await createCandidateExtended("M1", fd());
        // Passed the duplicate gate and reached the stubbed insert.
        expect(res).toEqual(INSERT_STUB_ERROR);
    });
});
```

- [ ] **Step 2: Run the tests — all four must pass**

```bash
cd /Users/henrikmolin/Desktop/Recruito/rekryteringsplattform && npx vitest run src/lib/actions/candidates-extended-duplicate.test.ts
```

Expected: `Test Files  1 passed`, `Tests  4 passed`. If a test FAILS, stop and report — the shipped block has a bug (these tests pin existing behavior; do not "fix" the test to match).

- [ ] **Step 3: Commit**

```bash
cd /Users/henrikmolin/Desktop/Recruito && git add rekryteringsplattform/src/lib/actions/candidates-extended-duplicate.test.ts && git commit -m "test(candidates): pin cross-recruiter same-job duplicate block"
```

---

### Task 2: Auto-run the duplicate check + include LinkedIn in the pre-check

**Files:**
- Modify: `rekryteringsplattform/src/components/dashboard/recruiter/candidate-submission-form.tsx:225-242` (handleVerify), `:433-439` (email input), `:545` (LinkedIn input)

The check-duplicate route already accepts `linkedin_url` — only the client needs to send it. `formRef` already exists on the `<form>` (line 424).

- [ ] **Step 1: Replace `handleVerify` (lines 225-242) with**

```tsx
    async function handleVerify() {
        if (!email.trim()) return;
        setVerifyStatus("checking");
        try {
            const fd = new FormData();
            fd.append("mandate_id", mandateId);
            fd.append("email", email.trim());
            // Include LinkedIn so the pre-check matches the server block,
            // which flags on email OR LinkedIn URL.
            const linkedIn = formRef.current
                ? String(new FormData(formRef.current).get("linkedin_url") || "").trim()
                : "";
            if (linkedIn) fd.append("linkedin_url", linkedIn);
            const res = await fetch("/api/candidates/check-duplicate", { method: "POST", body: fd });
            if (res.ok) {
                const { duplicate } = await res.json();
                setVerifyStatus(duplicate ? "blocked" : "ok");
            } else {
                setVerifyStatus("ok"); // fail-open so UI isn't stuck; server will still block
            }
        } catch {
            setVerifyStatus("ok");
        }
    }
```

- [ ] **Step 2: Auto-check on email blur — add `onBlur` to the email input (line ~433)**

```tsx
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setVerifyStatus("idle"); }}
                                    onBlur={() => { if (verifyStatus === "idle" && email.trim()) handleVerify(); }}
                                    placeholder={r.emailPlaceholder || "Enter Email"}
                                    className="h-11 flex-1 bg-slate-50 border-slate-200"
                                />
```

The `verifyStatus === "idle"` guard means it fires once per edit (onChange resets to `"idle"`), so tabbing through an unchanged field never re-calls the API. The manual Verify button stays — it is now a redundant-but-harmless explicit trigger.

- [ ] **Step 3: Re-check when LinkedIn is entered — add `onBlur` to the LinkedIn input (line ~545)**

```tsx
                                <Input type="url" name="linkedin_url" placeholder="https://linkedin.com/in/..." defaultValue={draftTextFields["linkedin_url"] || ""} onBlur={() => { if (email.trim()) handleVerify(); }} className="h-11 bg-slate-50 border-slate-200" />
```

Unconditional (no `"idle"` guard): a status of `"ok"` from the email-only check can flip to `"blocked"` once LinkedIn identity is added. The route allows 60 calls / 10 min per user — ample.

- [ ] **Step 4: Lint the changed file**

```bash
cd /Users/henrikmolin/Desktop/Recruito/rekryteringsplattform && npm run lint
```

Expected: no new errors (build alone does NOT run ESLint in this repo — lint is mandatory).

- [ ] **Step 5: Commit**

```bash
cd /Users/henrikmolin/Desktop/Recruito && git add rekryteringsplattform/src/components/dashboard/recruiter/candidate-submission-form.tsx && git commit -m "feat(recruiter): auto-flag duplicate candidates on email/LinkedIn blur"
```

---

### Task 3: Gate submit on a flagged duplicate

**Files:**
- Modify: `rekryteringsplattform/src/components/dashboard/recruiter/candidate-submission-form.tsx:354-361` (handleSubmit)

- [ ] **Step 1: Insert the gate right after the `declared` check, before `setFormError(null)` / `setSubmitting(true)`**

Current code (lines 354-361):

```tsx
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!declared) {
            setFormError(r.declarationRequired || "You must confirm the declaration to submit.");
            return;
        }
        setFormError(null);
        setSubmitting(true);
```

Becomes:

```tsx
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!declared) {
            setFormError(r.declarationRequired || "You must confirm the declaration to submit.");
            return;
        }
        // Auto-flag gate: a known duplicate can't be submitted — client mirror
        // of the server-side block so the recruiter isn't told only after
        // filling the whole form. Fail-open stays: an errored pre-check leaves
        // status "ok" and the server block remains authoritative.
        if (verifyStatus === "blocked") {
            setFormError(r.verifyAlreadyExists || "Candidate already registered in the system. Submission blocked.");
            if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        setFormError(null);
        setSubmitting(true);
```

Reuses the existing `verifyAlreadyExists` i18n key (present in all 4 dictionaries) — no dictionary edits, so the i18n build gate cannot trip.

- [ ] **Step 2: Lint**

```bash
cd /Users/henrikmolin/Desktop/Recruito/rekryteringsplattform && npm run lint
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /Users/henrikmolin/Desktop/Recruito && git add rekryteringsplattform/src/components/dashboard/recruiter/candidate-submission-form.tsx && git commit -m "feat(recruiter): block Present while duplicate flag is active"
```

---

### Task 4: Production gate + browser verification

- [ ] **Step 1: Full test suite**

```bash
cd /Users/henrikmolin/Desktop/Recruito/rekryteringsplattform && npx vitest run
```

Expected: all files pass (baseline was 265+ tests green; now +4).

- [ ] **Step 2: Build**

```bash
cd /Users/henrikmolin/Desktop/Recruito/rekryteringsplattform && npm run build
```

Expected: `✓ Compiled successfully` (type errors here have shipped twice — this step is non-negotiable).

- [ ] **Step 3: Browser-verify on the LOCAL stack (never `.env.local` — that is PROD)**

```bash
cd /Users/henrikmolin/Desktop/Recruito/rekryteringsplattform && npx dotenv-cli -e .env.localstack -- npx next dev
```

Then in the browser preview (users are `*@local.test`):
1. Log in as the recruiter, open a mandate that already has a presented candidate, and open the Present Candidate form.
2. Type that candidate's email, press Tab (no button click). Expected: red "already registered" flag appears automatically.
3. Click Present. Expected: blocked with the same message at the top of the form; no server call with a new candidate row.
4. Change to a fresh email, blur. Expected: green "not registered" message; form submits normally.

- [ ] **Step 4: Commit any fixes made during verification, then hand off**

Handoff must include: test count, build output, and what was browser-verified (evidence, not assertions — CLAUDE.md §8).

---

## Merge note

After all tasks green, use superpowers:finishing-a-development-branch to merge `feature/duplicate-flag-autocheck` into `main`.

---

## Addendum (2026-07-27, post-review fix — commit 9b15bbd)

Final review found a Critical in Task 3's premise: the pre-check flags **3** scenarios (same-job incl. drafts / same-company engaged / own portfolio) but the server rejects only **1** (same-job, non-draft). Gating submit on the raw `duplicate` flag hard-blocked flows the server accepts — worst case, a resumed draft self-matched its own row and could never be presented.

Fix (kept the plan's no-new-oracle constraint honest instead of literal):
- Route: same-job and own-portfolio queries exclude drafts; the same-job match alone returns `blocking: true`. This adds no enumeration oracle — `createCandidateExtended` already discloses exactly that case in its submit error, so it was always distinguishable by attempting a submit.
- Client: gate fires only on `blocking`; other duplicate signals render a new amber `warned` state (advisory, submit allowed). `verifySeq` ref guards against stale out-of-order check responses.
- i18n: `verifyWarnDuplicate` added to all 4 dictionaries (text-edited — the files contain duplicate JSON keys, never round-trip them).

E2E re-verified on the local stack: same-job → red + blocked; own-portfolio → amber + submit passes gate; resumed draft → green, no self-block.
