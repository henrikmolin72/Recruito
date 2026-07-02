# Candidate Count Parity (Admin ↔ Recruiter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every candidate count shown for a job (admin "Candidates (cap)" badge, recruiter "Ongoing process → Presented" panel, recruiter "Cap reached" button gates) derives from the ONE canonical predicate `candidateOccupiesCapSlot`, so Admin and Recruiter dashboards can never show different numbers for the same job.

**Architecture:** Add a pure `computeJobProcessStats()` helper in `mandate-stages.ts` (tested with vitest), rewire `getJobProcessStats` through it, and switch both recruiter-side "Cap reached" gates from per-recruiter raw row counts to the job-wide cap-occupancy count (admin client, counts only — no PII).

**Tech Stack:** Next.js App Router server actions, Supabase, vitest. No new dependencies, no migrations, no i18n dictionary changes (panel labels are hardcoded English).

---

## Root-cause analysis (read this first)

The client sees **1/8** on the Admin → Jobs table but a bigger number on the recruiter's view of the same job. There are four counting paths for one concept:

| # | Surface | Code | Semantics today |
|---|---------|------|-----------------|
| 1 | Admin Jobs "Candidates (cap)" | `src/lib/actions/admin.ts:446` | `countCandidatesAgainstCap` — job-wide; excludes `draft`; rejected/withdrawn/offer_declined release their slot. **Canonical.** |
| 2 | Recruiter "Ongoing process → Presented" (Browse Jobs `jobs/[id]` + `mandates/[id]`) | `src/lib/actions/recruiter.ts:667-693` (`getJobProcessStats`) | `presented = candidates.length` — job-wide but **includes drafts, rejected, withdrawn**. Always ≥ the admin number. **This is the mismatch the client sees.** Bonus bug: drafts and withdrawn leak into the "In process" tile (`inProcess = presented − inInterview − rejected`, and `candidateInStage(c,"rejected")` excludes withdrawn). |
| 3 | Recruiter My Mandates list "Cap reached" gate | `src/lib/actions/recruiter.ts:653` (`submitted_count` = raw length incl. drafts+rejected, **that mandate's candidates only**) → `recruiter-mandates-view.tsx:293-295` | Wrong predicate AND wrong scope (per-recruiter count compared to the job-wide cap). Overcounts drafts/rejected (button wrongly disabled) and undercounts other recruiters (button enabled, server then rejects). |
| 4 | Mandate detail "Present candidate" gate | `src/app/(dashboard)/recruiter/mandates/[id]/page.tsx:116` | Right predicate (`countCandidatesAgainstCap`) but wrong scope — only that recruiter's candidates, so it undercounts vs the job-wide server gate (`recruiter.ts:522`, `candidates-extended.ts:138`). |

**Decision (recommended, baked into this plan):** "Presented" on the recruiter panel = cap-occupying candidates = exactly the admin badge number. The 4th tile becomes "Rejected / withdrawn" showing the historical released-slot count, so recruiters still see churn. Alternative considered and rejected: keep "Presented" as historical total and only drop drafts — the admin/recruiter mismatch would persist whenever a rejection exists.

**Prod evidence check (optional, before executing):** run in Supabase SQL editor —
```sql
select status, count(*) from candidates
where job_id = (select id from jobs where title = 'Electrical Engineer' limit 1)
group by status;
```
Expected: exactly one cap-occupying status plus ≥1 draft/rejected/withdrawn row — the rows inflating the recruiter panel.

## File structure

- Modify: `rekryteringsplattform/src/lib/mandate-stages.ts` — add pure `computeJobProcessStats` (single responsibility: stage/stat math already lives here; imports `candidateOccupiesCapSlot` from `candidate-workflow.ts`, which imports nothing — no cycle).
- Modify: `rekryteringsplattform/src/lib/mandate-stages.test.ts` — new describe block.
- Modify: `rekryteringsplattform/src/lib/actions/recruiter.ts` — rewire `getJobProcessStats`; job-wide occupied count in `getRecruiterMandates`.
- Modify: `rekryteringsplattform/src/components/dashboard/shared/job-process-stats.tsx` — `released` tile + optional preloaded stats.
- Modify: `rekryteringsplattform/src/app/(dashboard)/recruiter/mandates/[id]/page.tsx` — job-wide gate.
- Modify: `rekryteringsplattform/src/components/dashboard/recruiter/recruiter-mandates-view.tsx` — gate field rename.

`src/lib/actions/admin.ts` is NOT touched — it is already canonical. `pending_candidates_count` (`recruiter.ts:473`) is a different concept (in-process only) — NOT touched. `placements.ts` — NOT touched.

All `npm`/`npx` commands below run in `rekryteringsplattform/`.

---

### Task 1: Pure stats helper `computeJobProcessStats` (TDD)

**Files:**
- Modify: `rekryteringsplattform/src/lib/mandate-stages.ts` (append after `candidateInStage`, ~line 183)
- Test: `rekryteringsplattform/src/lib/mandate-stages.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `mandate-stages.test.ts` (add `computeJobProcessStats` to the existing `./mandate-stages` import, and add a `countCandidatesAgainstCap` import from `./candidate-workflow`):

```ts
import { countCandidatesAgainstCap } from "./candidate-workflow";

describe("computeJobProcessStats", () => {
    it("excludes drafts from every bucket", () => {
        expect(
            computeJobProcessStats([{ status: "draft" }, { status: "submitted" }]),
        ).toEqual({ presented: 1, inProcess: 1, inInterview: 0, released: 0 });
    });

    it("presented matches the admin cap badge: rejected/withdrawn release the slot", () => {
        const stats = computeJobProcessStats([
            { status: "under_client_review", recruito_screened_at: "2026-07-01" },
            { status: "rejected_client" },
            { status: "candidate_withdrawn" },
        ]);
        expect(stats.presented).toBe(1);
        expect(stats.released).toBe(2);
    });

    it("splits interview stages out of in-process", () => {
        expect(
            computeJobProcessStats([
                { status: "interview_stage_1" },
                { status: "final_interview" },
                { status: "submitted" },
            ]),
        ).toEqual({ presented: 3, inProcess: 1, inInterview: 2, released: 0 });
    });

    it("keeps hired candidates presented; offer_declined releases", () => {
        expect(
            computeJobProcessStats([{ status: "hired" }, { status: "offer_declined" }]),
        ).toEqual({ presented: 1, inProcess: 1, inInterview: 0, released: 1 });
    });

    it("agrees with countCandidatesAgainstCap for any status mix", () => {
        const rows = [
            "draft", "submitted", "rejected_client", "interview_stage_2",
            "hired", "candidate_withdrawn", "offer_declined", "recruito_rejected",
        ].map((status) => ({ status }));
        expect(computeJobProcessStats(rows).presented).toBe(
            countCandidatesAgainstCap(rows.map((r) => r.status)),
        );
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/mandate-stages.test.ts`
Expected: FAIL — `computeJobProcessStats` is not exported.

- [ ] **Step 3: Implement the helper**

Append to `mandate-stages.ts` after `candidateInStage` (and add at the top of the file: `import { candidateOccupiesCapSlot } from "./candidate-workflow";` — the file currently has no imports; `candidate-workflow.ts` imports nothing, so no cycle):

```ts
// "Ongoing process" tile counts for a job. presented deliberately equals the
// admin "X / cap" badge (candidateOccupiesCapSlot): drafts are invisible and
// rejected/withdrawn/declined release their slot — admin and recruiter see
// these numbers side by side, so they must never drift (client bug 2026-07-02).
// released = once-submitted candidates whose slot was freed (rejection,
// withdrawal or declined offer) — historical churn, shown as its own tile.
export interface JobProcessStatCounts {
    presented: number;
    inProcess: number;
    inInterview: number;
    released: number;
}

export function computeJobProcessStats(rows: StageCandidate[]): JobProcessStatCounts {
    const submitted = rows.filter((c) => c.status && c.status !== "draft");
    const occupying = submitted.filter((c) => candidateOccupiesCapSlot(c.status));
    const inInterview = occupying.filter(
        (c) => candidateInStage(c, "interview") || candidateInStage(c, "final_interview"),
    ).length;
    return {
        presented: occupying.length,
        inProcess: occupying.length - inInterview,
        inInterview,
        released: submitted.length - occupying.length,
    };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/lib/mandate-stages.test.ts`
Expected: PASS (all pre-existing tests in the file still green).

- [ ] **Step 5: Commit**

```bash
git add rekryteringsplattform/src/lib/mandate-stages.ts rekryteringsplattform/src/lib/mandate-stages.test.ts
git commit -m "feat(candidates): computeJobProcessStats — cap-parity stats for job process panel"
```

### Task 2: Rewire `getJobProcessStats` + panel component

**Files:**
- Modify: `rekryteringsplattform/src/lib/actions/recruiter.ts:11` and `:664-693`
- Modify: `rekryteringsplattform/src/components/dashboard/shared/job-process-stats.tsx`

- [ ] **Step 1: Rewire the server action**

In `recruiter.ts`, replace line 11 (`candidateInStage` is used nowhere else in this file):

```ts
import { computeJobProcessStats } from "@/lib/mandate-stages";
```

Replace the whole `getJobProcessStats` function (current lines 664-693, comment included):

```ts
// Aggregate pipeline stats for a job across ALL recruiters' candidates, shown
// to any recruiter who opens the job so they can judge whether more candidates
// are needed. Counts only — no candidate PII. presented mirrors the admin
// "X / cap" badge (see computeJobProcessStats) so the dashboards never drift.
export async function getJobProcessStats(jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("candidates")
        .select("status, recruito_screened_at")
        .eq("job_id", jobId);

    if (error) {
        console.error("[getJobProcessStats]", error);
        return null;
    }

    return computeJobProcessStats(data || []);
}
```

- [ ] **Step 2: Update the panel component**

Replace `job-process-stats.tsx` in full:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { getJobProcessStats } from "@/lib/actions/recruiter";
import type { JobProcessStatCounts } from "@/lib/mandate-stages";

// Aggregate pipeline counts across ALL recruiters on a job. Shown to any
// recruiter (Browse Jobs + My Mandates) near the top so they can judge at a
// glance whether to keep sourcing candidates or ease off. Counts only, no PII.
// `preloaded` lets a page that already fetched the stats (for its cap gate)
// avoid a second query.
export async function JobProcessStats({
    jobId,
    preloaded,
}: {
    jobId: string;
    preloaded?: JobProcessStatCounts | null;
}) {
    const stats = preloaded ?? (await getJobProcessStats(jobId));
    if (!stats) return null;

    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Ongoing process</h2>
                    <p className="text-xs text-muted-foreground">Across all recruiters on this job</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Presented", value: stats.presented, color: "text-slate-900" },
                        { label: "In process", value: stats.inProcess, color: "text-blue-600" },
                        { label: "In interview", value: stats.inInterview, color: "text-purple-600" },
                        { label: "Rejected / withdrawn", value: stats.released, color: "text-red-600" },
                    ].map((s) => (
                        <div key={s.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                            <div className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</div>
                            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors (in particular no unused-import error for `candidateInStage` in recruiter.ts and no missing `stats.rejected` consumer anywhere — the panel was its only consumer).

- [ ] **Step 4: Run the full unit suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rekryteringsplattform/src/lib/actions/recruiter.ts rekryteringsplattform/src/components/dashboard/shared/job-process-stats.tsx
git commit -m "fix(recruiter): Presented count = admin cap badge; drafts/withdrawn no longer inflate process stats"
```

### Task 3: Mandate detail gate uses the job-wide count

**Files:**
- Modify: `rekryteringsplattform/src/app/(dashboard)/recruiter/mandates/[id]/page.tsx:10,113-118,160`

- [ ] **Step 1: Fetch stats once and gate on them**

Line 10 — add `getJobProcessStats` to the existing import:

```ts
import { getRecruiterMandateById, getJobProcessStats } from "@/lib/actions/recruiter";
```

Replace line 116 (`const capReached = countCandidatesAgainstCap(mandate.candidates.map((c) => c.status)) >= cap;`) with (and add the fetch line directly above the `const expiryDays` line 113):

```ts
  const jobStats = jobId ? await getJobProcessStats(jobId) : null;
```
```ts
  // Job-wide occupancy (all recruiters) — same number as the admin badge and
  // the server submission gate. Falls back to this recruiter's own rows only
  // if the stats fetch fails (button fail-open; the server gate still blocks).
  const capReached =
    (jobStats?.presented ?? countCandidatesAgainstCap(mandate.candidates.map((c) => c.status))) >= cap;
```

Also update the comment block above (lines 105-112): replace its last sentence (`capReached now excludes ... raw .length, which over-counted freed slots).`) with `capReached counts JOB-WIDE occupied slots via getJobProcessStats — the same number the admin badge and server gate use.`

Line 160 — pass the preloaded stats:

```tsx
      {jobId && <JobProcessStats jobId={jobId} preloaded={jobStats} />}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (`countCandidatesAgainstCap` import stays — it is the fallback).

- [ ] **Step 3: Commit**

```bash
git add "rekryteringsplattform/src/app/(dashboard)/recruiter/mandates/[id]/page.tsx"
git commit -m "fix(recruiter): mandate-detail cap gate counts job-wide occupancy, not own candidates"
```

### Task 4: Mandates-list gate uses job-wide occupancy

**Files:**
- Modify: `rekryteringsplattform/src/lib/actions/recruiter.ts:12,581-661`
- Modify: `rekryteringsplattform/src/components/dashboard/recruiter/recruiter-mandates-view.tsx:50,292-294`

- [ ] **Step 1: Compute job-wide occupied counts in `getRecruiterMandates`**

Line 12 — add `candidateOccupiesCapSlot`:

```ts
import { isCandidateInProcess, countCandidatesAgainstCap, candidateOccupiesCapSlot } from "@/lib/candidate-workflow";
```

In `getRecruiterMandates`, after the mandates fetch error-check (line 633) and before the `return mandates.map(...)`, insert:

```ts
    // Job-wide cap usage across ALL recruiters (admin client — RLS hides other
    // recruiters' rows from this user). Same predicate as the server submission
    // gate and the admin "X / cap" badge so "Cap reached" can never drift.
    // Counts only — statuses are never returned to the client.
    const jobIds = [...new Set(mandates.map((m: any) => m.job?.id).filter(Boolean))] as string[];
    const occupiedByJob = new Map<string, number>();
    if (jobIds.length > 0) {
        const adminClient = createAdminClient();
        const { data: capRows } = await adminClient
            .from("candidates")
            .select("job_id, status")
            .in("job_id", jobIds);
        for (const row of capRows || []) {
            if (candidateOccupiesCapSlot(row.status)) {
                occupiedByJob.set(row.job_id, (occupiedByJob.get(row.job_id) || 0) + 1);
            }
        }
    }
```

Replace the mapping line 653 (`submitted_count: (mandate.candidates || []).length,`):

```ts
        cap_occupied_count: mandate.job?.id ? (occupiedByJob.get(mandate.job.id) ?? 0) : 0,
```

(The nested `candidates:` select stays — the per-candidate list and the expiry calc are per-recruiter by design.)

- [ ] **Step 2: Update the view**

`recruiter-mandates-view.tsx` line 50: `submitted_count: number | null;` → `cap_occupied_count: number | null;`

Lines 293-294:

```ts
                                                        const occupied = mandate.cap_occupied_count ?? 0;
                                                        const capReached = occupied >= cap;
```

- [ ] **Step 3: Verify no stale references**

Run: `grep -rn "submitted_count" rekryteringsplattform/src`
Expected: no matches.

- [ ] **Step 4: Typecheck + tests**

Run: `npx tsc --noEmit && npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rekryteringsplattform/src/lib/actions/recruiter.ts rekryteringsplattform/src/components/dashboard/recruiter/recruiter-mandates-view.tsx
git commit -m "fix(recruiter): mandates-list Cap-reached gate = job-wide cap occupancy (was own raw rows incl. drafts)"
```

### Task 5: Production-ready gate + parity verification

**Files:** none (verification only)

- [ ] **Step 1: Build**

Run (in `rekryteringsplattform/`): `npm run build`
Expected: build succeeds.

- [ ] **Step 2: Lint** (build does NOT run ESLint in this repo — see CLAUDE.md §8)

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Full unit suite**

Run: `npm run test`
Expected: PASS, including the 5 new `computeJobProcessStats` tests.

- [ ] **Step 4: Manual parity check (dev server, seeded job with 1 active + 1 rejected candidate)**

1. Admin → Jobs: note the job's "Candidates (cap)" number (e.g. 1/8).
2. Recruiter → Browse Jobs → same job: "Presented" tile must equal that number; "Rejected / withdrawn" shows 1.
3. Recruiter → My Mandates: "Refer a Candidate" enabled iff Presented < cap.
4. Add a draft candidate: NO number changes anywhere.

- [ ] **Step 5: Security checklist (CLAUDE.md §6)**

- `getJobProcessStats` / `getRecruiterMandates` auth: both check `supabase.auth.getUser()` before the admin-client query; the new query returns counts only, no candidate PII, no raw DB errors to the client. ✔
- No IDOR change: the mandates query is still filtered by the caller's own `recruiter_id`; jobIds derive from those mandates. ✔
- No i18n keys added. ✔

- [ ] **Step 6: Hand off** with the evidence above (build/lint/test output + parity screenshots).
