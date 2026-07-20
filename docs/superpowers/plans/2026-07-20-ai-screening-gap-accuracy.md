# AI Screening Gap Accuracy + Recruiter Post-Submission View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the recruiter in-form AI screening from showing false gaps ("Years of Professional Experience", "Current Employment Status") that are actually present in the CV, and let recruiters view their screening result (score + gaps) after submitting the candidate.

**Architecture:** The false gaps are **parser artifacts, not model output**. `extractCriticalGaps()` scrapes the "KEY GAPS" block out of the report markdown heuristically; the prompt orders "Return ALL sections in TABLE FORMAT", and when the model renders Section A as one table, criterion rows (`| 4. Years of Professional Experience | … |`) start with `|`, never match the block-ending BOUNDARY regex, and pass 2 harvests their first cells as "gaps" (`clean()` even strips the `4. ` prefix, producing the exact bare titles in the client's screenshot). The admin/client reports render the full markdown untouched, which is why they look correct. Fix: (1) make the prompt emit a machine-readable `KEY_GAPS: [...]` line and parse it strictly (the extractor's own documented upgrade path), (2) harden the heuristic with a criterion-title denylist for legacy stored reports, (3) reuse the already-recruiter-authorized `getLatestEvaluation()` to render a score+gaps card on the recruiter candidate detail page.

**Tech Stack:** Next.js App Router (server components), Supabase (no schema change needed), Anthropic messages API (prompt text change only), Vitest.

**Explicitly NOT changing:** `run-evaluation.ts` call flow, `candidate_screenings` schema (no migration), the AI visibility policy (recruiters keep score+gaps only — the full internal report stays admin-side, the client report stays company-side per client request 2026-07-02). The declared-facts flow is already correct: screening auto-runs on CV upload before Section 3 is filled, and the prompt tells the model to derive criteria 4/5 from the CV when declared facts are "(not specified)" — the internal report did exactly that (see the accurate Experience table in the client's screenshot).

**Working dir:** all commands run in `rekryteringsplattform/`. Branch: `fix/ai-screening-gap-accuracy` off `main`.

---

### Task 0: Branch

- [ ] **Step 1: Create the branch**

```bash
cd rekryteringsplattform
git checkout main && git pull && git checkout -b fix/ai-screening-gap-accuracy
```

---

### Task 1: Harden the heuristic extractor (fixes legacy stored reports)

**Files:**
- Modify: `src/lib/screening/extract-critical-gaps.ts`
- Test: `src/lib/screening/extract-critical-gaps.test.ts`

- [ ] **Step 1: Write the failing repro test** (reproduces the 2026-07-20 client screenshot)

Append to the `describe("extractCriticalGaps")` block in `src/lib/screening/extract-critical-gaps.test.ts`:

```ts
  it("does not surface criterion-title table rows as gaps (table-format report, client bug 2026-07-20)", () => {
    // Section A rendered as ONE table: rows start with "|", never match the
    // BOUNDARY regex, so rows 4/5 leak into the Key Gaps block and pass 2
    // harvested "Years of Professional Experience" / "Current Employment
    // Status" as false gaps.
    const md = `## SECTION A — CORE SCREENING

| # | Criterion | Result |
|---|---|---|
| 1. JD Match — Direct | Partial |
| 2. Direct Match Score | 90% |
| 3. Key Gaps | - No explicit mention of manufacturing sector experience (~10%) - No formal continuous improvement methodology cited (~5%) |
| 4. Years of Professional Experience | 7 years 2 months |
| 5. Current Employment Status | Employed — Baltic Supply Solutions AB (Apr 2021–Present) |
| 6. Short-Term Positions | 0 |
| 7. Overqualification | No |
`;
    const gaps = extractCriticalGaps(md);
    expect(gaps.join(" ")).not.toMatch(/years of professional experience/i);
    expect(gaps.join(" ")).not.toMatch(/current employment status/i);
    expect(gaps.join(" ")).not.toMatch(/short-term positions/i);
    expect(gaps.join(" ")).not.toMatch(/overqualification/i);
    // Trade-off accepted: the real gaps live inside row 3's cell and are lost
    // in this layout — [] (score only) beats false gaps. New reports use the
    // structured KEY_GAPS line (Task 2) and never hit this path.
  });
```

- [ ] **Step 2: Run it — must FAIL**

```bash
npx vitest run src/lib/screening/extract-critical-gaps.test.ts
```
Expected: the new test fails (gaps contain "Years of Professional Experience").

- [ ] **Step 3: Add the criterion-title denylist**

In `src/lib/screening/extract-critical-gaps.ts`, below the `BOUNDARY` const, add:

```ts
// Criterion/section titles from evaluation-prompt.ts — never real gaps. They
// leak in when the model renders Section A as one table: rows start with "|",
// never match BOUNDARY, and pass 2 harvests "| 4. Years of Professional
// Experience | …" first cells (clean() strips the "4. "). Client bug 2026-07-20.
const CRITERION_TITLES =
  /^(jd match|direct match score|key gaps|years of professional experience|current employment status|short-?term positions|overqualification|recruiter summary|career history|education table|transferable skills|adjacent sector|bias|screening outcome)/i;
```

Inside `push()`, after the `if (/^(none|n\/?a|inga|ingen)\b/i.test(v)) return;` line, add:

```ts
    if (CRITERION_TITLES.test(v)) return;
```

- [ ] **Step 4: Run the whole test file — all PASS**

```bash
npx vitest run src/lib/screening/extract-critical-gaps.test.ts
```
Expected: all tests pass (existing tests confirm no regression in the normal bullet/table/prose paths).

- [ ] **Step 5: Commit**

```bash
git add src/lib/screening/extract-critical-gaps.ts src/lib/screening/extract-critical-gaps.test.ts
git commit -m "fix(screening): never surface criterion titles as recruiter gap chips"
```

---

### Task 2: Structured KEY_GAPS emission + strict parse (fixes all new reports)

**Files:**
- Modify: `src/lib/screening/evaluation-prompt.ts` (template text only)
- Modify: `src/lib/screening/extract-critical-gaps.ts`
- Test: `src/lib/screening/extract-critical-gaps.test.ts`, `src/lib/screening/evaluation-prompt.test.ts`

- [ ] **Step 1: Write the failing parser tests**

Append to `src/lib/screening/extract-critical-gaps.test.ts`:

```ts
  it("prefers the structured KEY_GAPS line over the heuristic", () => {
    const md = `### 3. KEY GAPS
- Stale heuristic line that must be ignored

KEY_GAPS: ["No manufacturing sector experience (~10%)", "No formal CI methodology cited (~5%)"]
FINAL_MATCH_SCORE: 90`;
    expect(extractCriticalGaps(md)).toEqual([
      "No manufacturing sector experience (~10%)",
      "No formal CI methodology cited (~5%)",
    ]);
  });

  it("returns [] for KEY_GAPS: [] without falling back to the heuristic", () => {
    const md = `### 3. KEY GAPS
- Must not appear

KEY_GAPS: []
FINAL_MATCH_SCORE: 95`;
    expect(extractCriticalGaps(md)).toEqual([]);
  });

  it("falls back to the heuristic when KEY_GAPS is malformed JSON", () => {
    const md = `### 3. KEY GAPS
- Real heuristic gap (10%)

KEY_GAPS: [broken
FINAL_MATCH_SCORE: 80`;
    expect(extractCriticalGaps(md)).toEqual(["Real heuristic gap (10%)"]);
  });

  it("filters criterion titles even out of the structured line", () => {
    const md = `KEY_GAPS: ["Current Employment Status", "No forklift certification (~10%)"]`;
    expect(extractCriticalGaps(md)).toEqual(["No forklift certification (~10%)"]);
  });
```

- [ ] **Step 2: Run — the 4 new tests must FAIL**

```bash
npx vitest run src/lib/screening/extract-critical-gaps.test.ts
```
Expected: FAIL (structured line not parsed yet; first test returns the stale heuristic bullet).

- [ ] **Step 3: Implement the strict parser**

In `src/lib/screening/extract-critical-gaps.ts`, add below `CRITERION_TITLES`:

```ts
// Structured marker (prompt emits it since 2026-07-20, next to
// FINAL_MATCH_SCORE): "KEY_GAPS: [...]" — a single-line JSON array. Strict
// parse; null = marker absent/broken → caller falls back to the heuristic.
// [] is a VALID "no gaps" answer and must NOT fall through to the heuristic.
function structuredGaps(markdown: string): string[] | null {
  const m = markdown.match(/^\s*KEY_GAPS:\s*(\[.*\])\s*$/im);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[1]);
    if (!Array.isArray(arr)) return null;
    const gaps: string[] = [];
    for (const item of arr) {
      if (typeof item !== "string") continue;
      let v = item.replace(/\s+/g, " ").trim();
      if (!v || !/[a-zA-Z]{3,}/.test(v)) continue;
      if (CRITERION_TITLES.test(v)) continue;
      if (v.length > MAX_LEN) v = v.slice(0, MAX_LEN - 1).trimEnd() + "…";
      gaps.push(v);
      if (gaps.length >= MAX_GAPS) break;
    }
    return gaps;
  } catch {
    return null;
  }
}
```

At the top of `extractCriticalGaps()`, right after `if (!markdown) return [];`, add:

```ts
  const structured = structuredGaps(markdown);
  if (structured !== null) return structured;
```

- [ ] **Step 4: Run — all extractor tests PASS**

```bash
npx vitest run src/lib/screening/extract-critical-gaps.test.ts
```
Expected: PASS.

- [ ] **Step 5: Write the failing prompt-template test**

Append to the describe block in `src/lib/screening/evaluation-prompt.test.ts` (it asserts substrings on a filled prompt — follow the existing pattern in that file, reusing its existing `prompt` fixture variable):

```ts
  it("orders a machine-readable KEY_GAPS line next to the final score", () => {
    expect(prompt).toMatch(/KEY_GAPS:/);
    expect(prompt).toMatch(/single-line JSON array/i);
    expect(prompt).toMatch(/NEVER list the criteria titles/i);
  });
```

Run: `npx vitest run src/lib/screening/evaluation-prompt.test.ts` — expected: FAIL.

- [ ] **Step 6: Add the KEY_GAPS instruction to the template**

In `src/lib/screening/evaluation-prompt.ts`, inside `PROMPT_TEMPLATE`, directly ABOVE the `FINAL LINE (required, machine-read …)` block, insert:

```
SECOND-TO-LAST LINE (required, machine-read — output exactly once, immediately before the FINAL_MATCH_SCORE line):
KEY_GAPS: <a single-line JSON array of the Q3 KEY GAPS, each a short plain-text string including its approximate % weight, e.g. ["No PLC programming experience (~20%)","No forklift certification (~10%)"]. Output KEY_GAPS: [] if there are none.>
Rules for this line: entries MUST be genuinely missing JD elements from Q3 only. NEVER list the criteria titles (years of experience, employment status, short-term positions, overqualification) as entries, NEVER list anything the CV or the CANDIDATE-DECLARED FACTS already evidence, and NEVER list unanswered screening questions.
```

(FINAL_MATCH_SCORE must remain the very last line — do not reorder.)

- [ ] **Step 7: Run the screening suite — all PASS**

```bash
npx vitest run src/lib/screening
```
Expected: PASS (evaluation-prompt, extract-critical-gaps, run-evaluation, and siblings all green; `run-evaluation.ts` needs no change — it already returns `extractCriticalGaps(reportMarkdown)`).

- [ ] **Step 8: Commit**

```bash
git add src/lib/screening/evaluation-prompt.ts src/lib/screening/evaluation-prompt.test.ts src/lib/screening/extract-critical-gaps.ts src/lib/screening/extract-critical-gaps.test.ts
git commit -m "feat(screening): structured KEY_GAPS marker replaces heuristic gap scraping"
```

---

### Task 3: Strip the KEY_GAPS machine line from client-visible fallback reports

**Files:**
- Modify: `src/lib/screening/extract-match-score.ts` (`stripClientVisibleScores`)
- Test: `src/lib/screening/extract-match-score.test.ts`

Context: companies normally get the dedicated `client_report_markdown` (separate prompt — never contains KEY_GAPS). But when that generation fails, `getCompanyCandidateScreening` falls back to the internal report through `stripClientVisibleScores`, which already drops the `FINAL_MATCH_SCORE` line. The new machine line must get the same treatment.

- [ ] **Step 1: Write the failing test**

Append to the `stripClientVisibleScores` describe block in `src/lib/screening/extract-match-score.test.ts` (create the describe block if the file only covers `extractMatchScore`):

```ts
  it("drops the KEY_GAPS machine line from client-visible reports", () => {
    const md = 'Summary line.\nKEY_GAPS: ["No X (~10%)"]\nFINAL_MATCH_SCORE: 90';
    const out = stripClientVisibleScores(md);
    expect(out).not.toMatch(/KEY_GAPS/);
    expect(out).toContain("Summary line.");
  });
```

Run: `npx vitest run src/lib/screening/extract-match-score.test.ts` — expected: FAIL.

- [ ] **Step 2: Add the line-drop**

In `stripClientVisibleScores` in `src/lib/screening/extract-match-score.ts`, directly after the existing `FINAL_MATCH_SCORE` line-drop `.replace(...)`, add:

```ts
    // Machine marker line ("KEY_GAPS: [...]") — drop the whole line.
    .replace(/^.*KEY_GAPS:\s*\[.*$/gim, "")
```

- [ ] **Step 3: Run — PASS**

```bash
npx vitest run src/lib/screening/extract-match-score.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/screening/extract-match-score.ts src/lib/screening/extract-match-score.test.ts
git commit -m "fix(screening): strip KEY_GAPS machine line from client fallback report"
```

---

### Task 4: Recruiter post-submission AI screening card

**Files:**
- Modify: `src/app/(dashboard)/recruiter/mandates/[id]/candidates/[candidateId]/page.tsx`

Design: score + gaps only (same as the in-form box), per the standing visibility policy (2026-07-02: recruiters see score+gaps, full internal report is admin-side, client report is company-side). Data comes from the stored `candidate_screenings` row via `getLatestEvaluation` — already recruiter-authorized with a candidate-ownership IDOR check (`src/lib/actions/screening.ts:16-53`; its comment even anticipates this page keying on the route mandate param). Score and gaps are re-derived server-side from the stored markdown with the same pure helpers the live run uses, so the card always matches what the recruiter saw in-form (and legacy reports benefit from Task 1's hardening). All i18n keys already exist in all 4 dictionaries (`aiScreenTitle`, `aiScreenScore`, `aiScreenNoScore`, `aiScreenGaps`, `aiScreenDisclaimer`) — **no dictionary edits** (and never reserialize the dicts: they contain duplicate JSON keys).

- [ ] **Step 1: Add imports and data fetch**

In `src/app/(dashboard)/recruiter/mandates/[id]/candidates/[candidateId]/page.tsx`:

Add to the imports:

```tsx
import { XCircle } from "lucide-react";
import { getLatestEvaluation } from "@/lib/actions/screening";
import { extractMatchScore } from "@/lib/screening/extract-match-score";
import { extractCriticalGaps } from "@/lib/screening/extract-critical-gaps";
```

(`XCircle` joins the existing `lucide-react` import list: `ArrowLeft, Mail, Phone, Linkedin, Download, XCircle`.)

In the page component, after the `stageHistory` assignment (line ~96), add:

```tsx
    // AI self-check the recruiter ran pre-submission (client request 2026-07-14:
    // viewable after submitting). Score + gaps only — the full report stays
    // admin-side, per the 2026-07-02 visibility policy. getLatestEvaluation
    // re-checks recruiter ownership of both mandate and candidate (IDOR).
    const evaluation = await getLatestEvaluation(candidateId, mandateId);
    const aiScore = evaluation ? extractMatchScore(evaluation.reportMarkdown) : null;
    const aiGaps = evaluation ? extractCriticalGaps(evaluation.reportMarkdown) : [];
```

- [ ] **Step 2: Render the card**

In the right column (`<div className="space-y-6">`), between the contact-info `Card` and the stage-history `Card`, add:

```tsx
                    {evaluation && (
                        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white">
                            <CardHeader className="pb-2">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{r.aiScreenTitle || "AI screening"}</h3>
                            </CardHeader>
                            <CardContent>
                                {aiScore !== null ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-3xl font-black tabular-nums ${aiScore >= 80 ? "text-emerald-600" : aiScore >= 60 ? "text-amber-500" : "text-red-500"}`}>
                                            {aiScore}%
                                        </span>
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{r.aiScreenScore || "AI Match Score"}</span>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">{r.aiScreenNoScore || "Screening ran, but no score could be extracted."}</p>
                                )}
                                {aiGaps.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{r.aiScreenGaps || "Gaps"}</p>
                                        <ul className="mt-1 space-y-1">
                                            {aiGaps.map((g, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                    <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                                                    <span>{g}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <p className="mt-2 text-[11px] text-slate-400">{r.aiScreenDisclaimer || "Decision support only — not an automated decision."}</p>
                            </CardContent>
                        </Card>
                    )}
```

(The card renders only when a stored screening exists — no empty state, no new i18n keys.)

- [ ] **Step 3: Typecheck via build**

```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/recruiter/mandates/[id]/candidates/[candidateId]/page.tsx"
git commit -m "feat(recruiter): show AI screening score + gaps on submitted candidate detail"
```

---

### Task 5: Production-ready gate + local-stack e2e

- [ ] **Step 1: Full test suite, lint, build**

```bash
npx vitest run && npm run lint && npm run build
```
Expected: all green. (Build does NOT run ESLint — lint separately, per project gate §8.)

- [ ] **Step 2: Local-stack browser e2e** (safe: `.env.local` is PROD — never drive it; use `.env.localstack` per `Dev-Notes`/auto-memory `reference_localstack_e2e`)

```bash
npx supabase migration up --local   # no new migrations expected; confirms stack is current
npx dotenv-cli -e .env.localstack -- npx next dev
```

With a real `ANTHROPIC_API_KEY` in `.env.localstack` (or the `ANTHROPIC_BASE_URL` mock from the presentation-rework e2e — if using the mock, its canned screening response must be extended with a `KEY_GAPS: ["…"]` line before `FINAL_MATCH_SCORE`, otherwise the heuristic fallback is what gets exercised):

1. Log in as the recruiter user (`@local.test`), open a mandate → Present Candidate.
2. Upload `/Users/henrikmolin/Desktop/Fixes in recruito/Ebbe Lorens.pdf` as the CV; wait for the auto-screening.
3. **Verify:** gap chips contain NO bare "Years of Professional Experience" / "Current Employment Status" entries; score renders.
4. Fill the remaining required sections, submit the candidate.
5. Open the submitted candidate under the mandate (`/recruiter/mandates/<id>/candidates/<candidateId>`).
6. **Verify:** the new "AI screening" card shows the same score + gaps + disclaimer.
7. Log in as admin, open the candidate: full report still renders (regression check). Log in as the company user for the job (if the candidate is Recruito-screened + scored ≥75): client report still renders without any `KEY_GAPS`/`FINAL_MATCH_SCORE` lines.

- [ ] **Step 3: Capture evidence in the handoff** — screenshot of step 3 and step 6, vitest/lint/build outputs.

- [ ] **Step 4: Merge**

```bash
git checkout main && git merge --no-ff fix/ai-screening-gap-accuracy && git push
```

---

## Self-review notes

- **Why not fix BOUNDARY instead?** The table-format failure is one of many free-text layouts; the structured marker (Task 2) removes the whole failure class for new reports, and the denylist (Task 1) is the minimal guard for the legacy rows already stored in `candidate_screenings`. Matches the extractor's own documented upgrade path.
- **Why no migration/new action for the recruiter card?** `getLatestEvaluation` already grants recruiters the stored report with a full IDOR check; score/gaps re-derive deterministically from the stored markdown with existing pure functions. Zero schema, zero new endpoints, zero new i18n keys.
- **Declared facts (employment status / years) at screening time:** intentionally unchanged. The auto-run fires on CV upload before Section 3 is filled; the prompt already instructs deriving criteria 4/5 from the CV in that case, and the stored reports prove it does. The manual "Re-run" button covers recruiters who want a post-Section-3 refresh.
- **Open question for the client (non-blocking, default taken):** the card shows score+gaps, consistent with the 2026-07-02 policy. If they actually want recruiters to see the FULL internal report post-submission, swap the card body for the existing markdown-report rendering used on the admin candidate page — small follow-up, not in this plan.
