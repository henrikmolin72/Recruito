# Company Reject Reason List — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the structured rejection-reason list so that when a client moves a candidate to **Rejected** in the Present Status panel, they must pick a reason, and that reason is persisted to the stage-history audit trail.

**Architecture:** Mirror the existing recruiter **withdraw** pattern. A `CANDIDATE_REJECT_REASONS` constant (key+label) drives a selectable list inside the existing "Confirm Stage Change" modal, shown only when the pending stage is `rejected`. The chosen reason's human label flows through `updateCompanyStage(reason)` → `logCandidateStageChange({reason})` → `candidate_stage_history.reason`, which the timeline already renders. No DB migration (the `reason` column exists, migration 052). No dictionary changes (this modal's chrome is already hardcoded English and reason labels are hardcoded in the const, matching `CANDIDATE_WITHDRAW_REASONS`).

**Tech Stack:** Next.js (App Router), React client component, TypeScript, Supabase, Vitest.

---

## File Structure

- `src/lib/candidate-workflow.ts` — add `CANDIDATE_REJECT_REASONS`, `CANDIDATE_REJECT_REASON_KEYS`, `rejectReasonLabel()`. Pure module (no server imports) — safe for the client panel and unit tests.
- `src/lib/actions/candidates.ts` — `updateCompanyStage` gains an optional `reason` arg; rejection requires a valid reason key, stores its label on the audit row.
- `src/components/dashboard/company/candidate-present-status-panel.tsx` — render the reason list in the reject confirm modal; require a selection; pass the key to the action.
- `src/lib/candidate-workflow.test.ts` — pin the reason list + label lookup.

---

### Task 1: Define the rejection reasons (data + lookup)

**Files:**
- Modify: `src/lib/candidate-workflow.ts` (insert after `CANDIDATE_WITHDRAW_REASON_KEYS`, ~line 301)
- Test: `src/lib/candidate-workflow.test.ts`

- [ ] **Step 1: Write the failing test** — append to `src/lib/candidate-workflow.test.ts`

```ts
describe("candidate rejection reasons", () => {
    it("offers the standard client rejection reasons in order", () => {
        expect(CANDIDATE_REJECT_REASONS.map((r) => r.label)).toEqual([
            "Skills/experience don't match requirements",
            "Insufficient relevant experience",
            "Salary expectations too high",
            "Stronger candidate selected",
            "Not a culture fit",
            "Location / relocation issue",
            "Did not pass interview or assessment",
            "Position filled or on hold",
            "Other",
        ]);
    });

    it("maps a known reason key to its label and returns null for unknown keys", () => {
        expect(rejectReasonLabel("not_a_culture_fit")).toBe("Not a culture fit");
        expect(rejectReasonLabel("bogus")).toBeNull();
    });
});
```

Also add to the existing top import block in that test file:

```ts
    CANDIDATE_REJECT_REASONS,
    rejectReasonLabel,
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd rekryteringsplattform && npx vitest run src/lib/candidate-workflow.test.ts`
Expected: FAIL — `CANDIDATE_REJECT_REASONS`/`rejectReasonLabel` is not exported.

- [ ] **Step 3: Add the constant + lookup** — in `src/lib/candidate-workflow.ts` after `CANDIDATE_WITHDRAW_REASON_KEYS`

```ts
// Structured reasons a client must pick when rejecting a candidate from the
// company Present Status panel. Mirrors CANDIDATE_WITHDRAW_REASONS: hardcoded
// English labels (the panel renders r.label directly), and the chosen label is
// persisted to candidate_stage_history.reason so the timeline renders it as-is.
export const CANDIDATE_REJECT_REASONS = [
  { key: "skills_experience_mismatch", label: "Skills/experience don't match requirements" },
  { key: "insufficient_relevant_experience", label: "Insufficient relevant experience" },
  { key: "salary_expectations_too_high", label: "Salary expectations too high" },
  { key: "stronger_candidate_selected", label: "Stronger candidate selected" },
  { key: "not_a_culture_fit", label: "Not a culture fit" },
  { key: "location_relocation_issue", label: "Location / relocation issue" },
  { key: "did_not_pass_interview_or_assessment", label: "Did not pass interview or assessment" },
  { key: "position_filled_or_on_hold", label: "Position filled or on hold" },
  { key: "other", label: "Other" },
] as const;

export const CANDIDATE_REJECT_REASON_KEYS = new Set<string>(
  CANDIDATE_REJECT_REASONS.map((r) => r.key),
);

// Map a reason key to its human label (stored on the audit row), null if unknown.
export function rejectReasonLabel(key: string): string | null {
  return CANDIDATE_REJECT_REASONS.find((r) => r.key === key)?.label ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd rekryteringsplattform && npx vitest run src/lib/candidate-workflow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add rekryteringsplattform/src/lib/candidate-workflow.ts rekryteringsplattform/src/lib/candidate-workflow.test.ts
git commit -m "feat(candidates): add structured client rejection reasons"
```

---

### Task 2: Require + persist the reason in `updateCompanyStage`

**Files:**
- Modify: `src/lib/actions/candidates.ts` (import block ~line 20; `updateCompanyStage` signature line 534; reject guard after the matrix check ~line 555; `logCandidateStageChange` call ~line 630)

- [ ] **Step 1: Add the import** — extend the existing `@/lib/candidate-workflow` import that already brings in `CANDIDATE_WITHDRAW_REASON_KEYS`

```ts
    CANDIDATE_REJECT_REASON_KEYS,
    rejectReasonLabel,
```

(`CANDIDATE_REJECT_REASON_KEYS` is imported for symmetry/guarding even though `rejectReasonLabel` does the lookup; remove it if the linter flags it as unused.)

- [ ] **Step 2: Widen the signature** — line 534

```ts
export async function updateCompanyStage(candidateId: string, jobId: string, stage: string, reason?: string) {
```

- [ ] **Step 3: Guard rejection — require a valid reason** — insert immediately after the `canTransition` matrix check (after the `if (stage !== current && !canTransition(...)) { return ... }` block, ~line 555)

```ts
    // A client rejection must carry a structured reason (mirrors recruiter
    // withdrawal). The chosen reason's human label is stored on the audit row so
    // the stage-history timeline renders it directly.
    let rejectReasonText: string | null = null;
    if (stage === "rejected") {
        const label = reason ? rejectReasonLabel(reason) : null;
        if (!label) return { error: "Please select a reason for rejecting this candidate." };
        rejectReasonText = label;
    }
```

- [ ] **Step 4: Persist it** — in the `logCandidateStageChange({ ... })` call (~line 630) add the field

```ts
        changedBy: user.id,
        changedByRole: "company",
        reason: rejectReasonText,
```

- [ ] **Step 5: Typecheck**

Run: `cd rekryteringsplattform && npx tsc --noEmit`
Expected: no new errors from `candidates.ts`.

- [ ] **Step 6: Commit**

```bash
git add rekryteringsplattform/src/lib/actions/candidates.ts
git commit -m "feat(candidates): require + log reason on client rejection"
```

---

### Task 3: Reason picker in the reject confirm modal

**Files:**
- Modify: `src/components/dashboard/company/candidate-present-status-panel.tsx` (imports line 5/7; state ~line 88; `confirmStageChange` ~line 129; modal JSX ~line 294)

- [ ] **Step 1: Imports** — add the const + the `Check` icon

Line 5 area, add import:
```ts
import { CANDIDATE_REJECT_REASONS } from "@/lib/candidate-workflow";
```
Line 7, extend the lucide import with `Check`:
```ts
import { CheckCircle2, XCircle, Handshake, Clock, RotateCcw, Check } from "lucide-react";
```

- [ ] **Step 2: State** — add next to the other `useState` hooks (~line 88)

```ts
    const [rejectReason, setRejectReason] = useState<string>("");
```

- [ ] **Step 3: Pass the reason + enforce selection** — replace `confirmStageChange` (lines 129-141)

```ts
    const confirmStageChange = () => {
        if (!pendingStage) return;
        const stage = pendingStage;
        if (stage === "rejected" && !rejectReason) return; // reason is required
        const reason = stage === "rejected" ? rejectReason : undefined;
        setPendingStage(null);
        setRejectReason("");
        startTransition(async () => {
            const result = await updateCompanyStage(candidateId, jobId, stage, reason);
            if (!result.error) {
                setCurrentStage(stage);
                // After a successful hire, offer to close the position.
                if (stage === "hired") setShowCloseJob(true);
            }
        });
    };
```

- [ ] **Step 4: Render the list** — replace the `pendingStage &&` modal block (lines 294-320)

```tsx
            {pendingStage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => { setPendingStage(null); setRejectReason(""); }} />
                    <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-base font-bold text-slate-900 mb-2">Confirm Stage Change</h2>
                        <p className="text-sm text-slate-500 mb-4">
                            Move candidate to <strong>{STAGES.find(s => s.value === pendingStage)?.label}</strong>?
                        </p>
                        {pendingStage === "rejected" && (
                            <>
                                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Select a reason for rejection
                                </p>
                                <ul className="max-h-56 space-y-1.5 overflow-y-auto mb-4">
                                    {CANDIDATE_REJECT_REASONS.map((r) => {
                                        const selected = rejectReason === r.key;
                                        return (
                                            <li key={r.key}>
                                                <button
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() => setRejectReason(r.key)}
                                                    className={
                                                        "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors " +
                                                        (selected
                                                            ? "border-red-300 bg-red-50 font-semibold text-red-700"
                                                            : "border-slate-200 text-slate-700 hover:border-red-200 hover:bg-red-50/40")
                                                    }
                                                >
                                                    <span>{r.label}</span>
                                                    {selected && <Check className="h-4 w-4 shrink-0" />}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </>
                        )}
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => { setPendingStage(null); setRejectReason(""); }}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmStageChange}
                                disabled={isPending || (pendingStage === "rejected" && !rejectReason)}
                                className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
```

- [ ] **Step 5: Commit**

```bash
git add rekryteringsplattform/src/components/dashboard/company/candidate-present-status-panel.tsx
git commit -m "feat(company): reason picker in reject confirm modal"
```

---

### Task 4: Production-ready gate (CLAUDE.md §8)

- [ ] **Step 1: Unit tests** — `cd rekryteringsplattform && npx vitest run src/lib/candidate-workflow.test.ts` → PASS
- [ ] **Step 2: Lint** — `cd rekryteringsplattform && npm run lint` → no new errors (build does NOT run ESLint; run it separately)
- [ ] **Step 3: Build** — `cd rekryteringsplattform && npm run build` → success
- [ ] **Step 4: Manual/preview check** — open a company candidate, click **Reject**: list of 9 reasons appears; Confirm disabled until one is picked; after confirming, the reason shows in **Stage history**.
- [ ] **Step 5: Reviews** — `/code-review` then `/security-review` (§6: the action authenticates, authorizes company role, validates the reason against the allowed set, returns generic error strings — confirm no regression).

---

## Self-Review

- **Spec coverage:** list restored (Task 1+3), required (Task 2+3 server+client), persisted & displayed (Task 2, timeline pre-existing). ✅
- **Type consistency:** `rejectReasonLabel` defined in Task 1, used in Task 2; `CANDIDATE_REJECT_REASONS` defined in Task 1, used in Task 3 + test. Names match across tasks. ✅
- **No placeholders:** every step shows real code/commands. ✅
- **Out of scope (not done):** translating reason labels into sv/no/da (matches the existing English-only `CANDIDATE_WITHDRAW_REASONS`); free-text elaboration box.
