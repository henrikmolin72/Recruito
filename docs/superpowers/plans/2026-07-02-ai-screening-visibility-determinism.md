# AI Screening — Recruiter/Client Visibility Split + Scoring Determinism

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** (1) Recruiters see only match % + top gaps (always shown, never the full AI report); (2) Clients/companies get the full AI report as a decision-support tool with a disclaimer; (3) the AI match score is deterministic for the same CV+job and reliably caps low when a hard requirement (e.g. Swedish fluency) is unmet.

**Architecture:** Next.js App Router, Supabase (service-role for screening data), Anthropic TS SDK. App lives in `rekryteringsplattform/`; run all `npm`/`npx` there. No DB migration — `candidate_screenings` stays service-role-only; the company reads it through an authorized server action using the admin client.

**Tech stack:** TypeScript, React Server Components, vitest.

---

## Root-cause & current state (verified via exploration)

**Determinism bug (images 76% / 67% / 75% for the same CV):** the score is parsed out of the model's markdown by regex in `src/lib/screening/extract-match-score.ts`, taking the last "Adjusted Match Score" and falling back to "Direct Match Score". When the model emits "Adjusted Match Score: N/A" on one run and a number on another, the extractor flips between the adjusted and the direct value → the score swings run-to-run. Contributing: `temperature: 0.1` in `src/lib/screening/run-evaluation.ts` (not 0), and the prompt in `src/lib/screening/evaluation-prompt.ts` gates only the *recommendation* on unmet requirements, never caps the *numeric score*. **Anthropic's API has no `seed` parameter — do not add one.**

**Visibility, current state:**
- Recruiter, before submit: `src/components/dashboard/recruiter/candidate-submission-form.tsx` (~lines 599-648) shows match % + top gaps behind an optional "Run AI screening" button (`handleScreen`, ~line 301, calls `screenDraftCandidate`). Already limited to score+gaps — but optional, not auto.
- Recruiter, after submit: `src/app/(dashboard)/recruiter/mandates/[id]/candidates/[candidateId]/page.tsx:177` renders `<ScreeningReportCard>`, which (`src/components/screening/screening-report-card.tsx`) has a "Show report" button opening a modal with the FULL markdown report. **This is what the client wants removed for recruiters.**
- Client/company: `src/app/(dashboard)/company/jobs/[id]/candidates/[candidateId]/page.tsx` (~lines 155-161) shows only `ai_match_score`. **The client wants the full report here.**

**Model config:** `run-evaluation.ts` uses `process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"`. `temperature` is accepted on Sonnet 4.6 but 400s on Sonnet 5 / Opus 4.7+. Prod screenings currently work, so prod runs a 4.6-era model. Keep the temperature change but comment the caveat.

## Testing reality (read before starting)

Live LLM screening and recruiter browser flows are NOT runnable here (no ANTHROPIC_API_KEY exercise in tests; `.env.test.local` has only company+admin logins, no recruiter). "Confirm through testing" therefore means: vitest unit tests for the deterministic pieces (score extraction incl. the canonical marker), `npm run build`, `npm run lint`, `npx tsc --noEmit`, and code-level auth/security review. The score-stability and cap behavior are made deterministic-by-construction (canonical marker + prompt rubric) and unit-tested at the extraction layer; note in the handoff that a live eval on a seeded candidate is the final human check.

## File structure

- Modify `src/lib/screening/extract-match-score.ts` + new test `src/lib/screening/extract-match-score.test.ts` — canonical marker extraction.
- Modify `src/lib/screening/evaluation-prompt.ts` — emit canonical `FINAL_MATCH_SCORE:` marker; add hard-requirement cap rubric.
- Modify `src/lib/screening/run-evaluation.ts` — `temperature: 0`.
- New `src/components/screening/screening-summary-card.tsx` — recruiter-facing score+gaps+disclaimer (server component).
- Modify recruiter candidate detail page — swap `ScreeningReportCard` → `ScreeningSummaryCard`.
- New server action `getCompanyCandidateScreening` in `src/lib/actions/screening.ts` — company-authorized full report fetch.
- New `src/components/screening/company-screening-report.tsx` — full report + disclaimer for the company.
- Modify company candidate detail page — render the company report block.
- Modify recruiter submission form — auto-run screening on CV upload, relabel panel as always-on.
- Modify every dictionary in `src/i18n/dictionaries/` — any new/changed UI strings (build fails otherwise).

All commit messages end with a blank line then `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Stage only the files each task touches (the tree has unrelated pre-existing modifications — never `git add -A`).

---

### Task 1: Deterministic score extraction via canonical marker (TDD)

**Files:** `src/lib/screening/extract-match-score.ts`, new `src/lib/screening/extract-match-score.test.ts`

- [ ] **Step 1 — Read** the current `extract-match-score.ts` fully so you preserve its existing signature `extractMatchScore(markdown: string): number | null` and its fallback regex behavior.

- [ ] **Step 2 — Write failing tests** in `src/lib/screening/extract-match-score.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extractMatchScore } from "./extract-match-score";

describe("extractMatchScore", () => {
    it("prefers the canonical FINAL_MATCH_SCORE marker over prose scores", () => {
        const md = `Direct Match Score: 76%\nAdjusted Match Score: 67%\n\nFINAL_MATCH_SCORE: 42`;
        expect(extractMatchScore(md)).toBe(42);
    });

    it("reads the marker with a percent sign and surrounding whitespace", () => {
        expect(extractMatchScore("blah\n\nFINAL_MATCH_SCORE:  50 %\n")).toBe(50);
    });

    it("is stable regardless of Adjusted-vs-Direct prose wording when the marker is present", () => {
        const a = `Adjusted Match Score: N/A\nDirect Match Score: 67%\nFINAL_MATCH_SCORE: 40`;
        const b = `Adjusted Match Score: 75%\nDirect Match Score: 70%\nFINAL_MATCH_SCORE: 40`;
        expect(extractMatchScore(a)).toBe(extractMatchScore(b));
    });

    it("falls back to prose scores when no marker is present (legacy reports)", () => {
        expect(extractMatchScore("Direct Match Score: 80%")).toBe(80);
    });

    it("ignores out-of-range marker values and falls back", () => {
        expect(extractMatchScore("FINAL_MATCH_SCORE: 250\nDirect Match Score: 55%")).toBe(55);
    });

    it("returns null when neither marker nor prose score exists", () => {
        expect(extractMatchScore("no score here")).toBeNull();
    });
});
```

- [ ] **Step 3 — Run, expect fail:** `npm run test -- src/lib/screening/extract-match-score.test.ts`

- [ ] **Step 4 — Implement.** Add a canonical-marker pass ahead of the existing prose regex. Keep the existing fallback exactly as-is:

```ts
// Canonical machine-readable score the prompt is instructed to emit as its
// LAST line ("FINAL_MATCH_SCORE: NN"). Extracting this instead of parsing prose
// removes the Adjusted-vs-Direct ambiguity that made the same CV score
// differently run-to-run (client report 2026-07-02). Falls back to the legacy
// prose regex for reports generated before the marker existed.
function canonicalScore(markdown: string): number | null {
    const m = markdown.match(/FINAL_MATCH_SCORE:\s*(\d{1,3})\s*%?/i);
    if (!m) return null;
    const value = Number(m[1]);
    return value >= 0 && value <= 100 ? value : null;
}
```

Then at the top of `extractMatchScore`, after the `if (!markdown) return null;` guard, add:

```ts
    const canonical = canonicalScore(markdown);
    if (canonical !== null) return canonical;
```

(Leave the existing `lastScore("Adjusted Match Score") ?? lastScore("Direct Match Score")` return as the fallback.)

- [ ] **Step 5 — Run, expect pass:** `npm run test -- src/lib/screening/extract-match-score.test.ts`

- [ ] **Step 6 — Commit** `src/lib/screening/extract-match-score.ts` + test: `feat(screening): deterministic match-score extraction via canonical FINAL_MATCH_SCORE marker`

### Task 2: Prompt — emit the canonical marker + hard-requirement cap

**Files:** `src/lib/screening/evaluation-prompt.ts`

- [ ] **Step 1 — Read** `evaluation-prompt.ts` fully (the `PROMPT_TEMPLATE`, ~lines 25-184, and `fillEvaluationPrompt`).

- [ ] **Step 2 — Add a hard-requirement cap rule** to the scoring rules section (the "SCREENING RULES" block near the Direct Match Score / Key Gaps instructions). Insert this rule verbatim:

```
- HARD REQUIREMENTS CAP: Treat any requirement the JD marks as mandatory / required / "must have" (including a required working language, a required certification, or a legally required work authorization) as a gate. If the CV does not demonstrate a mandatory requirement, the Direct Match Score MUST NOT exceed 49%, regardless of other strengths. If several mandatory requirements are unmet, score proportionally lower. A strong adjacent profile can still be noted, but never lifts the score above 49% while a mandatory requirement is unmet.
```

- [ ] **Step 3 — Append the canonical score line** as the FINAL thing the model must output. At the very end of `PROMPT_TEMPLATE` (after the existing audit-metadata section), add:

```
──────────────────────────────────────────────────────────────────
FINAL LINE (required, machine-read — output exactly once, as the very last line):
FINAL_MATCH_SCORE: <the final match score as an integer 0-100, no % sign>
This number MUST equal the Adjusted Match Score if one applies, otherwise the Direct Match Score, after applying the HARD REQUIREMENTS CAP above.
```

Do not change `fillEvaluationPrompt` or the placeholders. If the exact section headings differ from what's quoted, insert the two blocks at the semantically correct spots (cap rule with the other scoring rules; FINAL_MATCH_SCORE as the literal last line) and note the adaptation as a concern.

- [ ] **Step 4 — Typecheck:** `npx tsc --noEmit` (no runtime test — this is prompt text).

- [ ] **Step 5 — Commit:** `feat(screening): prompt emits canonical score line + caps score when a mandatory requirement is unmet`

### Task 3: temperature 0 for run-to-run stability

**Files:** `src/lib/screening/run-evaluation.ts`

- [ ] **Step 1 — Read** the `anthropic.messages.create({...})` call (~lines 79-99).

- [ ] **Step 2 — Change** `temperature: 0.1` to:

```ts
        // ponytail: 0 for maximum determinism. NOTE: temperature is accepted on
        // the default Sonnet 4.6 model but 400s on Sonnet 5 / Opus 4.7+ — if
        // ANTHROPIC_MODEL is ever pointed at one of those, remove this field.
        temperature: 0,
```

Do NOT add a `seed` parameter (the Anthropic API has none). Change nothing else.

- [ ] **Step 3 — Typecheck:** `npx tsc --noEmit`

- [ ] **Step 4 — Commit:** `fix(screening): temperature 0 for deterministic AI match scores`

### Task 4: Recruiter-facing ScreeningSummaryCard (score + gaps + disclaimer)

**Files:** new `src/components/screening/screening-summary-card.tsx`

Read `src/components/screening/screening-report-card.tsx` for the existing card styling and the `r` dict keys it uses (`aiEvalTitle`, `aiEvalReadonlyIntro`, `aiEvalNoReport`), and `src/lib/screening/extract-critical-gaps.ts` + `extract-match-score.ts` for the extractors.

- [ ] **Step 1 — Create** a server component that takes the stored evaluation and renders ONLY score + top gaps + the decision-support disclaimer — no "Show report" button, no `MarkdownReport`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { extractMatchScore } from "@/lib/screening/extract-match-score";
import { extractCriticalGaps } from "@/lib/screening/extract-critical-gaps";
import type { StoredEvaluation } from "@/lib/actions/screening";

// Recruiter-facing AI screening summary: match score + top gaps only. Recruiters
// never see the full report — that is a client-only decision-support tool (client
// request 2026-07-02: the full report can wrongly imply a high scorer must
// advance, when clients reject for reasons AI can't see). Score/gaps are derived
// from the stored report so this stays in sync with what the company's score shows.
export function ScreeningSummaryCard({
    report,
    dict,
}: {
    report: StoredEvaluation | null;
    dict: Record<string, string>;
}) {
    if (!report) return null;
    const score = extractMatchScore(report.reportMarkdown);
    const gaps = extractCriticalGaps(report.reportMarkdown);
    const scoreColor =
        score == null ? "text-slate-900" : score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";

    return (
        <Card>
            <CardContent className="p-5 space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    {dict.aiEvalTitle || "AI screening"}
                </h2>
                {score != null && (
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-black tabular-nums ${scoreColor}`}>{score}%</span>
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {dict.aiScreenScore || "AI Match Score"}
                        </span>
                    </div>
                )}
                {gaps.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {dict.aiScreenGaps || "Critical gaps"}
                        </p>
                        <ul className="space-y-1">
                            {gaps.map((g, i) => (
                                <li key={i} className="text-sm text-slate-700 flex gap-2">
                                    <span aria-hidden className="text-amber-500">⚠</span>
                                    <span>{g}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                    {dict.aiScreenDisclaimer ||
                        "Decision support only — not an automated decision. The full report stays in Recruito."}
                </p>
            </CardContent>
        </Card>
    );
}
```

- [ ] **Step 2 — Typecheck:** `npx tsc --noEmit` (confirm `StoredEvaluation` is exported from `src/lib/actions/screening.ts`; if it is a local type, export it).

- [ ] **Step 3 — Commit:** `feat(screening): recruiter-facing ScreeningSummaryCard (score + gaps only)`

### Task 5: Recruiter candidate detail page uses the summary card, not the full report

**Files:** `src/app/(dashboard)/recruiter/mandates/[id]/candidates/[candidateId]/page.tsx`

- [ ] **Step 1 — Read** the page around line 177 where `<ScreeningReportCard report={latestEvaluation} dict={r as any} />` is rendered, and the import of `ScreeningReportCard`.

- [ ] **Step 2 — Replace** the import and the usage:
  - Import `ScreeningSummaryCard` from `@/components/screening/screening-summary-card` instead of `ScreeningReportCard`.
  - Replace `<ScreeningReportCard report={latestEvaluation} dict={r as any} />` with `<ScreeningSummaryCard report={latestEvaluation} dict={r as any} />`.
  - If `ScreeningReportCard` is now unused anywhere in this file, remove its import. Do NOT delete the `screening-report-card.tsx` component file — it is reused by the company side (Task 7).

- [ ] **Step 3 — Verify no other recruiter surface renders the full report:** `grep -rn "ScreeningReportCard" rekryteringsplattform/src/app/\(dashboard\)/recruiter rekryteringsplattform/src/components/dashboard/recruiter` — expect no matches. If any exist, replace them the same way and note it.

- [ ] **Step 4 — Typecheck:** `npx tsc --noEmit`

- [ ] **Step 5 — Commit:** `fix(recruiter): show AI score+gaps summary on candidate detail, not the full report`

### Task 6: Company-authorized full-report fetch

**Files:** `src/lib/actions/screening.ts`

Read the existing `getLatestEvaluation` in this file for the `StoredEvaluation` shape and the admin-client + auth pattern. Also read how the company candidate page authorizes access (it already gates on the company owning the job and `recruito_screened_at` — mirror that ownership check).

- [ ] **Step 1 — Add** `getCompanyCandidateScreening(candidateId: string): Promise<StoredEvaluation | null>`:
  - `const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return null;`
  - Resolve the caller's company; confirm the candidate's `job_id` belongs to that company AND the candidate has `recruito_screened_at` set (companies only ever see screened candidates — reuse the same ownership rule the company candidate page already enforces). If not authorized, return null.
  - With `createAdminClient()`, read the latest `candidate_screenings` row for `candidate_id` (`order("created_at", { ascending: false }).limit(1)`), return `{ reportMarkdown, modelVersion, createdAt }` (same shape as `getLatestEvaluation`). Counts/report only — never leak other candidates' data; map any DB error to `null` and `console.error` server-side (do not return raw errors).

Match the exact auth/ownership approach the existing code uses — do not invent a new authorization scheme. If the ownership lookup is non-trivial, reuse whatever helper the company candidate page uses.

- [ ] **Step 2 — Typecheck:** `npx tsc --noEmit`

- [ ] **Step 3 — Commit:** `feat(screening): company-authorized getCompanyCandidateScreening server action`

### Task 7: Company full-report block + disclaimer on the candidate detail page

**Files:** new `src/components/screening/company-screening-report.tsx`, modify `src/app/(dashboard)/company/jobs/[id]/candidates/[candidateId]/page.tsx`

Read `screening-report-card.tsx` / `markdown-report.tsx` to reuse `MarkdownReport` for rendering, and the company candidate page layout (the right sidebar / main column structure around lines 155-270).

- [ ] **Step 1 — Create** `src/components/screening/company-screening-report.tsx` (server component): fetch via `getCompanyCandidateScreening(candidateId)`, and if present render a card containing the full `<MarkdownReport markdown={report.reportMarkdown} />` plus a prominent decision-support disclaimer:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownReport } from "@/components/screening/markdown-report";
import { getCompanyCandidateScreening } from "@/lib/actions/screening";

// Full AI screening report — CLIENT-ONLY decision-support tool (client request
// 2026-07-02). Recruiters never see this; only the company reviewing the
// candidate. Always carries the "decision support only" disclaimer because
// clients reject for factors AI can't evaluate (location, culture fit, salary…).
export async function CompanyScreeningReport({ candidateId }: { candidateId: string }) {
    const report = await getCompanyCandidateScreening(candidateId);
    if (!report) return null;
    return (
        <Card>
            <CardContent className="p-5 space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">AI screening report</h2>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    This AI screening is decision support only. It evaluates the CV against the job description and
                    cannot account for interview performance, location or commuting preferences, team or cultural fit,
                    salary expectations, or other business considerations. Final hiring decisions are always yours.
                </div>
                <MarkdownReport markdown={report.reportMarkdown} />
            </CardContent>
        </Card>
    );
}
```

- [ ] **Step 2 — Render it** on the company candidate detail page in the main content column (below `CandidateDetailSections`), passing the candidate id already available on the page. Import `CompanyScreeningReport` and add `<CompanyScreeningReport candidateId={candidate.id} />` (use whatever the page's candidate id variable is). Keep the existing header `ai_match_score` badge as-is.

- [ ] **Step 3 — Typecheck + build:** `npx tsc --noEmit && npm run build`

- [ ] **Step 4 — Commit:** `feat(company): show full AI screening report + decision-support disclaimer on candidate detail`

### Task 8: Recruiter form — auto-run screening, always shown, not "optional"

**Files:** `src/components/dashboard/recruiter/candidate-submission-form.tsx`, all dictionaries in `src/i18n/dictionaries/`

Read the AI-screening panel (~lines 599-648), `handleScreen` (~line 301), and the CV upload handler / `cvFile` state.

- [ ] **Step 1 — Auto-run on CV upload.** Add an effect that runs the screening automatically once a CV file is present and hasn't yet been screened for that file, instead of requiring the button click. Guard against re-runs (rate limit is 15/10min): only auto-run when `cvFile` changes to a new file and there is no `screenResult` for it yet. Keep `handleScreen` usable as a manual "Re-run" affordance. Concretely: track the screened file (e.g. by name+size) in state; in a `useEffect` on `cvFile`, if it differs from the screened marker and not currently `screening`, call the same screening logic. Extract the core of `handleScreen` into a callable `runScreening()` the effect and the button both use. Follow this repo's existing hook conventions; if an auto-run-on-effect approach risks a lint error (`react-hooks/set-state-in-effect` has shipped red before — see CLAUDE.md §8), guard it so lint stays green.

- [ ] **Step 2 — Relabel** the panel from "optional". Change the `aiScreenTitle` usage/label so it no longer says "(optional)"; keep the hint that the client never sees it. The button becomes "Re-run AI screening". Update the dictionary keys accordingly.

- [ ] **Step 3 — i18n:** update `aiScreenTitle` (drop "(optional)") and add any new key (e.g. `aiScreenRerun`) in EVERY file under `src/i18n/dictionaries/` (build fails if a key is missing in any locale — CLAUDE.md §6). Keep translations consistent with each locale.

- [ ] **Step 4 — Build + lint:** `npm run build && npm run lint`

- [ ] **Step 5 — Commit:** `feat(recruiter): AI screening runs automatically on CV upload and is always shown (was optional)`

### Task 9: Production-ready gate + verification

**Files:** none (verification only)

- [ ] **Step 1 — Build:** `npm run build` — succeeds.
- [ ] **Step 2 — Lint:** `npm run lint` — 0 errors (build does not run ESLint; CLAUDE.md §8).
- [ ] **Step 3 — Typecheck:** `npx tsc --noEmit` — clean.
- [ ] **Step 4 — Unit tests:** `npm run test` — all pass, incl. the new `extract-match-score.test.ts`.
- [ ] **Step 5 — Security checklist (CLAUDE.md §6):** `getCompanyCandidateScreening` authenticates via `supabase.auth.getUser()`, verifies company ownership of the job + `recruito_screened_at` before returning any report (IDOR), returns counts/report only for the authorized candidate, maps DB errors to null with no raw error leakage; `candidate_screenings` remains service-role-only (no new RLS/grant); no new secrets; i18n keys present in every dictionary.
- [ ] **Step 6 — Grep sanity:** `grep -rn "ScreeningReportCard\|MarkdownReport" rekryteringsplattform/src/app/(dashboard)/recruiter rekryteringsplattform/src/components/dashboard/recruiter` returns nothing (recruiters can't reach the full report).
- [ ] **Step 7 — Hand off** with build/lint/test output and the note that a live recruiter+company browser check on a seeded candidate (recruiter login not available in this env) is the final human verification for the auto-run UX and the score-cap behavior.
