# Interview Date Rename + Recruiter Dashboard Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four annotated-screenshot fixes: (1) rename "Date of First Contact" → "Interview Date", (2) remove Phone/Email/Messaging contact methods, (3) block future dates in the interview-date picker, (4) fix incorrect recruiter-dashboard data and merge the stat boxes into one outer card with equal tiles.

**Architecture:** All UI work is label/option-level in existing components (no schema rename — DB column stays `first_contact_date`). The dashboard data bugs are root-caused: `updateCompanyStage` never applies `statusChangeTimestampPatch`, so company-driven hires never write `candidates.hired_at` → `fn_recalculate_recruiter_metrics` averages over zero rows → COALESCE → "0 days" always. Guarantee-rate additionally excludes `refund_processing` placements that the rest of the app counts as failed. One migration (073) backfills + fixes the fn.

**Tech Stack:** Next.js App Router, Supabase (SQL migrations), Vitest, i18n dictionaries (en/sv/da/no — all four must stay in sync or the build fails).

**Branch:** create `feature/interview-date-dashboard-fixes` first (never implement on `main`). Use a worktree per superpowers:using-git-worktrees if executing with subagents.

**App dir:** all `npm`/`npx` commands run in `rekryteringsplattform/`. All source paths below are relative to `rekryteringsplattform/` unless they start with `docs/`.

---

## Root-cause evidence (read before executing)

1. **Avg. time to hire always 0:** `statusChangeTimestampPatch` (src/lib/candidate-workflow.ts:339) sets `hired_at` on `status === "hired"`, and the recruiter-side paths use it — but `updateCompanyStage` (src/lib/actions/candidates.ts:574, patch built at ~607–621) writes only `{ company_stage, status, company_viewed_at? }`. Companies are the ones who hire (stage-progression engine), so `hired_at` stays NULL, `fn_recalculate_recruiter_metrics` (migration 063 lines 33–37) gets NULL avg, and `COALESCE(v_avg_days, 0)` renders 0. No DB trigger writes `hired_at` (verified across all migrations). Side effect of same bug: `reviewed_at` / `interview_at` / `offered_at` / `status_changed_at` are also skipped on company moves (company analytics reads these — src/app/api/analytics/company/route.ts:68).
2. **Guarantee result inconsistency:** the fn counts `guarantee_total` as `status IN ('payout_released','guarantee_failed')`, but `refund_processing` is a real reachable status (set in src/app/api/guarantee/breach/review/route.ts:69) that src/lib/guarantee.ts:40 and `FAILED_PLACEMENT_STATUSES` (src/lib/pricing.ts:24) treat as failed. A placement in `refund_processing` shows failed in the Guarantees tab but is invisible to the dashboard %.
3. **"Active guarantees 1" / "50%" plausibility:** with only 2 hires these numbers imply ≥3 placements — likely stale demo rows in prod (same class as the 2026-07-08 Anna Karlsson repair). Agents are blocked from prod DB; Task 5 includes diagnostic SQL for Henrik to run in the Supabase SQL editor before any data repair.
4. **Label sources:** i18n key `firstContactLabel` in all 4 dicts (line ~1016 each) + fallback string in candidate-submission-form.tsx:982 + hardcoded "Date of First Contact" in src/components/shared/candidate-detail-sections.tsx:166 + hardcoded "First contact" in src/app/(dashboard)/admin/candidates/[id]/page.tsx:190 + the words "date and method of first contact" in the validation error message at src/lib/actions/candidates-extended.ts:150.
5. **Contact options:** rendered inline at candidate-submission-form.tsx:988–994 (`in_person`, `video_call`, `phone`, `email`, `messaging`). Company view formats stored values via `formatContactMethod` — leave that untouched so legacy candidates still display.

---

### Task 1: Rename "Date of First Contact" → "Interview Date"

**Files:**
- Modify: `src/i18n/dictionaries/en.json:1016`, `sv.json:1016`, `da.json:1016`, `no.json:1016`
- Modify: `src/components/dashboard/recruiter/candidate-submission-form.tsx:982`
- Modify: `src/components/shared/candidate-detail-sections.tsx:166`
- Modify: `src/app/(dashboard)/admin/candidates/[id]/page.tsx:190`
- Modify: `src/lib/actions/candidates-extended.ts:150`

- [ ] **Step 1: Update the four dictionaries** (key stays `firstContactLabel`; do NOT rename the key — only the value):

| dict | old | new |
|---|---|---|
| en.json | `"Date of First Contact"` | `"Interview Date"` |
| sv.json | `"Datum för första kontakt"` | `"Intervjudatum"` |
| da.json | `"Dato for første kontakt"` | `"Interviewdato"` |
| no.json | `"Dato for første kontakt"` | `"Intervjudato"` |

⚠️ Edit the JSON by hand/Edit tool — dictionaries contain duplicate keys; never round-trip them through a JSON parser (see memory note 2026-07-08).

- [ ] **Step 2: Update fallback + hardcoded strings**

candidate-submission-form.tsx:982:
```tsx
<Label>{r.firstContactLabel || "Interview Date"}<Req /></Label>
```

candidate-detail-sections.tsx:166:
```tsx
<p className="text-muted-foreground">Interview Date</p>
```

admin/candidates/[id]/page.tsx:190:
```tsx
<Field label="Interview date" value={c.first_contact_date} />
```

candidates-extended.ts:150 — in the required-fields error message, replace the phrase `date and method of first contact` with `interview date and method of contact` (leave the rest of the sentence untouched).

- [ ] **Step 3: Verify no stragglers**

Run: `grep -rin "first contact" src --include="*.ts" --include="*.tsx" --include="*.json"`
Expected: only `first_contact_date` field-name identifiers remain (DB column is NOT renamed — no migration).

- [ ] **Step 4: Commit** — `git commit -m "fix(ui): rename Date of First Contact to Interview Date"`

---

### Task 2: Remove Phone / Email / Messaging contact methods

**Files:**
- Modify: `src/components/dashboard/recruiter/candidate-submission-form.tsx:988–994` (options), `:129` (state init), `:214` (draft restore)
- Modify: all 4 dicts — remove the recruiter-form keys `contactPhone`, `contactEmail`, `contactMessaging` (they sit next to `contactInPerson`/`contactVideo`; do NOT touch the admin-company key `fieldContactPhone`)

- [ ] **Step 1: Shrink the options array** (candidate-submission-form.tsx):

```tsx
{[
    { value: "in_person", label: r.contactInPerson || "In Person" },
    { value: "video_call", label: r.contactVideo || "Video Call" },
].map((opt) => (
```

- [ ] **Step 2: Guard stale drafts** — a saved draft may hold a removed value; normalize it so the required-validation can't pass with an invisible selection. Add near the top of the component:

```tsx
const CONTACT_METHODS = ["in_person", "video_call"];
const normalizeContactMethod = (v: string) => (CONTACT_METHODS.includes(v) ? v : "");
```

Line 129: `const [contactMethod, setContactMethod] = useState(normalizeContactMethod(ds("contact_method")));`
Line 214: `if (d.contactMethod) setContactMethod(normalizeContactMethod(d.contactMethod));`

- [ ] **Step 3: Remove the three orphaned dict keys** from en/sv/da/no (verify first: `grep -rn "r.contactPhone\|r.contactEmail\|r.contactMessaging" src` → only the lines deleted in Step 1).

- [ ] **Step 4: Verify display of legacy data** — `formatContactMethod` in candidate-detail-sections.tsx stays untouched; old candidates with `phone`/`email`/`messaging` still render.

- [ ] **Step 5: Commit** — `git commit -m "fix(form): contact method limited to In Person and Video Call"`

---

### Task 3: Block future interview dates

**Files:**
- Modify: `src/components/dashboard/recruiter/candidate-submission-form.tsx:983`
- Modify: `src/lib/candidate-form.ts:146` (server-side trust boundary)
- Test: `src/lib/candidate-form.test.ts`

- [ ] **Step 1: Write the failing server-side test** (candidate-form.test.ts, alongside the existing missing-fields cases):

```ts
it("rejects a future first_contact_date as missing", () => {
    const fd = new FormData(); // or reuse the file's existing valid-FormData pattern
    fd.set("first_contact_date", "2099-01-01");
    expect(getMissingRequiredFields(fd, 0)).toContain("first_contact_date");
});
```

(`getMissingRequiredFields(formData, screeningQuestionCount)` at candidate-form.ts:130 is the authoritative validator — used by BOTH client and server action, so this one change enforces the rule at the trust boundary and gives client-side feedback.)

- [ ] **Step 2: Run it** — `npx vitest run src/lib/candidate-form.test.ts` → the new case FAILS (future date currently accepted).

- [ ] **Step 3: Server-side check** (candidate-form.ts:146, inside `getMissingRequiredFields`):

```ts
const firstContact = fdString(formData.get("first_contact_date")).trim();
// YYYY-MM-DD strings compare lexicographically; sv-SE locale formats as YYYY-MM-DD
if (!firstContact || firstContact > new Date().toLocaleDateString("sv-SE")) {
    missing.push("first_contact_date");
}
```

- [ ] **Step 4: Client-side `max`** (candidate-submission-form.tsx:983) — native date input grays out out-of-range dates, exactly the annotated ask:

```tsx
<Input type="date" name="first_contact_date" max={new Date().toLocaleDateString("sv-SE")}
    defaultValue={draftTextFields["first_contact_date"] || ""} className="date-input-lg h-11 bg-slate-50 border-slate-200" />
```

- [ ] **Step 5: Run tests** — `npx vitest run src/lib/candidate-form.test.ts` → PASS (all cases).

- [ ] **Step 6: Commit** — `git commit -m "fix(form): interview date cannot be in the future"`

---

### Task 4: Fix "Avg. time to hire 0 days" — company hires never write hired_at

**Files:**
- Test: `src/lib/actions/candidates-stage-notify.test.ts` (reuse its mocked-supabase harness for `updateCompanyStage`)
- Modify: `src/lib/actions/candidates.ts:619–621`
- Create: `supabase/migrations/073_hired_at_backfill_and_guarantee_rate.sql`

- [ ] **Step 1: Write the failing test** — extend the existing harness so the `candidates` table mock captures the update patch, then:

```ts
it("stamps hired_at (and status_changed_at) when the company moves a candidate to hired", async () => {
    candidateStage = "final_interview";
    const captured: Record<string, any>[] = [];
    // in the harness's from("candidates") mock: update: (p) => { captured.push(p); return chainable; }
    await updateCompanyStage("C", "J", "hired");
    const patch = captured.find((p) => p.status === "hired");
    expect(patch?.hired_at).toBeTruthy();
    expect(patch?.status_changed_at).toBeTruthy();
});
```

- [ ] **Step 2: Run it** — `npx vitest run src/lib/actions/candidates-stage-notify.test.ts` → new case FAILS (patch has no `hired_at`).

- [ ] **Step 3: Apply the timestamp patch in updateCompanyStage** (candidates.ts:619 — `statusChangeTimestampPatch` is already imported at line 20):

```ts
const mappedStatus = COMPANY_STAGE_TO_STATUS[stage as CompanyStageValue];
if (mappedStatus) {
    patch.status = mappedStatus;
    // Company-driven moves previously skipped the workflow timestamps, so
    // hired_at was never written → avg-time-to-hire always 0 (dashboard bug).
    Object.assign(patch, statusChangeTimestampPatch(mappedStatus));
}
```

Note: this also starts stamping `status_changed_at`/`reviewed_at`/`interview_at`/`offered_at` on company moves — correct semantics (status actually changes), and it feeds the company analytics route that already reads those columns. `stage === "viewed"` maps to null → still untouched.

- [ ] **Step 4: Run tests** — the new case PASSES and every pre-existing case in the file still passes.

- [ ] **Step 5: Migration 073 (part 1 — backfill)** — historical company-path hires lack `hired_at`; recover it from stage history (written by ALL paths since migrations 052/065/071):

```sql
-- 073: (a) backfill hired_at lost by company-driven hires, (b) count
-- refund_processing as a failed guarantee, (c) refresh all perf snapshots.
-- No new tables → no GRANT needed.

UPDATE candidates c
SET hired_at = h.first_hired
FROM (
    SELECT candidate_id, MIN(created_at) AS first_hired
    FROM candidate_stage_history
    WHERE action = 'hire' OR to_stage = 'hired'
    GROUP BY candidate_id
) h
WHERE c.id = h.candidate_id
  AND c.hired_at IS NULL;
```

- [ ] **Step 6: Commit** — `git commit -m "fix(metrics): company hires stamp hired_at; backfill from stage history"` (migration file continues in Task 5 before applying).

---

### Task 5: Guarantee metrics consistency + prod diagnosis

**Files:**
- Modify: `supabase/migrations/073_hired_at_backfill_and_guarantee_rate.sql` (append)
- Modify: `src/lib/actions/placements.ts:~827` (the `.in("status", [...])` pre-063 fallback list)

- [ ] **Step 1: Append the fn replacement to migration 073** — full body copied from 063 with ONE change (guarantee_total includes `refund_processing`) plus the snapshot refresh:

```sql
CREATE OR REPLACE FUNCTION fn_recalculate_recruiter_metrics(p_recruiter_id UUID)
RETURNS VOID AS $$
DECLARE
  v_submitted INTEGER;
  v_hired INTEGER;
  v_hire_rate DECIMAL(5,2);
  v_avg_days INTEGER;
  v_active INTEGER;
  v_guarantee_total INTEGER;
  v_guarantee_passed INTEGER;
  v_guarantee_rate DECIMAL(5,2);
BEGIN
  SELECT COUNT(*) INTO v_submitted
    FROM candidates WHERE recruiter_id = p_recruiter_id;

  SELECT COUNT(*) INTO v_hired
    FROM candidates WHERE recruiter_id = p_recruiter_id
      AND status IN ('hired', 'invoice_enabled', 'guarantee_tracking', 'completed');

  v_hire_rate := CASE WHEN v_submitted > 0
    THEN ROUND((v_hired::DECIMAL / v_submitted) * 100, 2)
    ELSE 0 END;

  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (hired_at - submitted_at)) / 86400))::INTEGER
    INTO v_avg_days
    FROM candidates
    WHERE recruiter_id = p_recruiter_id AND hired_at IS NOT NULL;

  SELECT COUNT(*) INTO v_active
    FROM placements WHERE recruiter_id = p_recruiter_id AND status = 'guarantee_active';

  -- refund_processing IS a failed guarantee (guarantee.ts + FAILED_PLACEMENT_STATUSES)
  SELECT COUNT(*) INTO v_guarantee_total
    FROM placements WHERE recruiter_id = p_recruiter_id
      AND status IN ('payout_released', 'guarantee_failed', 'refund_processing');

  SELECT COUNT(*) INTO v_guarantee_passed
    FROM placements WHERE recruiter_id = p_recruiter_id
      AND status = 'payout_released';

  v_guarantee_rate := CASE WHEN v_guarantee_total > 0
    THEN ROUND((v_guarantee_passed::DECIMAL / v_guarantee_total) * 100, 2)
    ELSE NULL END;

  UPDATE recruiters SET
    perf_candidates_submitted = v_submitted,
    perf_candidates_hired = v_hired,
    perf_hire_rate = v_hire_rate,
    perf_avg_time_to_hire_days = COALESCE(v_avg_days, 0),
    perf_active_placements = v_active,
    perf_guarantee_success_rate = v_guarantee_rate,
    perf_last_calculated_at = NOW()
  WHERE id = p_recruiter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh every snapshot so backfilled hired_at + new rate rules show immediately.
SELECT fn_recalculate_recruiter_metrics(id) FROM recruiters;
```

- [ ] **Step 2: Mirror the status list app-side** — placements.ts `getRecruiterPerformanceMetrics`, the pre-063 nulling fallback:

```ts
.in("status", ["payout_released", "guarantee_failed", "refund_processing"]);
```

(placements.ts is load-bearing; this is the only line touched and it traces directly to this request.)

- [ ] **Step 3: Apply locally + verify** — `npx supabase migration up --local`, then on the local stack confirm a company-driven hire produces `hired_at` and a non-zero avg after recalc.

- [ ] **Step 4: Commit** — `git commit -m "fix(metrics): guarantee rate counts refund_processing; refresh snapshots"`

- [ ] **Step 5 (Henrik, prod SQL editor — agents are blocked from prod):** diagnose the demo recruiter's "1 active / 50%" figures before any data repair:

```sql
SELECT p.id, p.status, p.created_at, p.joining_date,
       c.first_name, c.last_name, c.status AS candidate_status
FROM placements p
LEFT JOIN candidates c ON c.id = p.candidate_id
JOIN recruiters r ON r.id = p.recruiter_id
JOIN auth.users u ON u.id = r.user_id
WHERE u.email = '<demo-recruiter-email>'
ORDER BY p.created_at;
```

If stale/orphaned placements turn up (the 2026-07-08 Anna Karlsson pattern), decide the repair from evidence — not part of this plan.

---

### Task 6: Dashboard redesign — one outer card, equal tiles

**Files:**
- Modify: `src/components/dashboard/recruiter/performance-metrics.tsx` (becomes the single overview card)
- Modify: `src/app/(dashboard)/recruiter/page.tsx:39–61` (replace the three sections with one component)

Design proposal (Henrik approves/vetoes at plan review): ONE `Card` titled with the existing `recruiter.perfTitle` key, containing a uniform responsive grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) of 11 equal tiles in the existing `MetricCard` icon+text style (`h-full` for equal heights). No new colors/fonts — existing tokens only (`bg-muted/50`, brand/blue/amber/emerald/green/purple chips already in the file). No new i18n keys.

Tile order: Active mandates, Presented candidates, In interview, Hired, Interview rate (with its "{moved} of {submitted}" description), Hire rate (with description), Avg. time to hire, Open jobs, Active guarantees, Guarantee result, Rating.

- [ ] **Step 1: Rework `performance-metrics.tsx`** into `RecruiterOverview`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, Shield, Users, Briefcase, FileCheck, CalendarClock, UserCheck, Target, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { createTranslator } from "@/i18n/server";

interface RecruiterOverviewProps {
    openJobs: number;
    stats: { activeMandates: number; candidates: number; inInterview: number; hired: number; movedToInterview: number };
    rates: { interviewRate: number; hireRate: number; submitted: number; candidatesHired: number };
    metrics: {
        rating: number;
        avgTimeToHireDays: number;
        activePlacements: number;
        guaranteeSuccessRate: number | null;
    };
}

function Tile({ label, value, suffix, icon: Icon, color, description }: {
    label: string; value: string | number; suffix?: string;
    icon: React.ElementType; color: string; description?: string;
}) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 h-full">
            <div className={cn("p-2 rounded-md", color)}>
                <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
                <p className="text-lg font-bold leading-tight">
                    {value}{suffix && <span className="text-sm font-normal text-muted-foreground ml-0.5">{suffix}</span>}
                </p>
                {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
            </div>
        </div>
    );
}

export async function RecruiterOverview({ stats, rates, metrics, openJobs }: RecruiterOverviewProps) {
    const t = await createTranslator();
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-brand-600" />
                    {t("recruiter.perfTitle")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <Tile label={t("recruiter.activeMandates")} value={stats.activeMandates} icon={FileCheck} color="bg-brand-600" />
                    <Tile label={t("recruiter.presentedCandidates")} value={stats.candidates} icon={Users} color="bg-blue-600" />
                    <Tile label={t("recruiter.inInterview")} value={stats.inInterview} icon={CalendarClock} color="bg-amber-600" />
                    <Tile label={t("recruiter.hired")} value={stats.hired} icon={UserCheck} color="bg-emerald-600" />
                    <Tile label={t("recruiter.rateInterview")} value={`${rates.interviewRate}%`} icon={CalendarClock} color="bg-blue-600"
                        description={t("recruiter.rateInterviewSub").replace("{moved}", String(stats.movedToInterview)).replace("{submitted}", String(rates.submitted))} />
                    <Tile label={t("recruiter.rateHire")} value={`${rates.hireRate}%`} icon={Target} color="bg-green-600"
                        description={t("recruiter.rateHireSub").replace("{hired}", String(rates.candidatesHired)).replace("{submitted}", String(rates.submitted))} />
                    <Tile label={t("recruiter.perfAvgTimeToHire")} value={metrics.avgTimeToHireDays} suffix={t("recruiter.perfDaysSuffix")} icon={Clock} color="bg-blue-600" />
                    <Tile label={t("recruiter.perfOpenJobs")} value={openJobs} icon={Briefcase} color="bg-amber-600" />
                    <Tile label={t("recruiter.perfActiveGuarantees")} value={metrics.activePlacements} icon={Shield} color="bg-emerald-600" />
                    <Tile label={t("recruiter.perfGuaranteeResult")} value={metrics.guaranteeSuccessRate ?? "—"}
                        suffix={metrics.guaranteeSuccessRate != null ? "%" : undefined} icon={Shield} color="bg-green-600" />
                    <Tile label={t("recruiter.perfRating")} value={metrics.rating > 0 ? metrics.rating.toFixed(1) : "—"}
                        suffix={metrics.rating > 0 ? "/5" : ""} icon={Star} color="bg-purple-600" />
                </div>
            </CardContent>
        </Card>
    );
}
```

Check exact i18n key names against page.tsx's `r.*` usage before wiring (`r` may be a section object, e.g. `dict.recruiter` — if page.tsx passes labels as props today, keep that pattern instead of `t()` calls; match whichever pattern `page.tsx` currently uses).

- [ ] **Step 2: Rework `page.tsx:39–61`** — delete the two `StatsCard` grids and the `PerformanceMetrics` usage; render `RecruiterOverview` with `stats`, the already-computed `interviewRate`/`hireRate`/`submitted`/`candidatesHired`, `metrics`, and `openJobs={availableJobs.length}`. Remove imports that become unused (`StatsCard` and its icons if nothing else on the page uses them). Handle `metrics === null`: pass zeros/null-safe defaults (previously the whole perf card was hidden; now render tiles with 0/"—").

- [ ] **Step 3: Visual verification on the local stack** (`.env.localstack`, never `.env.local` — that is PROD): log in as the local recruiter, screenshot the dashboard, confirm one outer box + equal tiles at mobile/tablet/desktop widths.

- [ ] **Step 4: Commit** — `git commit -m "feat(dashboard): recruiter overview merged into one card with equal tiles"`

---

### Task 7: Production-ready gate + finish

- [ ] `npm run build` — passes (also proves the 4 dicts stayed in sync).
- [ ] `npm run lint` — passes (build does NOT run ESLint; lint-only errors have shipped red twice).
- [ ] `npx vitest run` — full suite green, including the two new reproducing tests (Task 3 + Task 4).
- [ ] Local-stack e2e: submit a candidate (interview-date picker blocks future dates, only 2 contact methods), company hires them, recalc → dashboard shows non-zero avg time to hire; screenshots as evidence.
- [ ] Use superpowers:finishing-a-development-branch — merge/PR choice is Henrik's.
- [ ] Prod steps for Henrik after merge: apply migration 073 in Supabase SQL editor (or `supabase db push`); optionally run the Task 5 diagnostic SQL for the demo recruiter.

---

## Open questions for Henrik (answer before execution)

1. **Dashboard layout:** the plan implements the "one outer box + equal inner boxes (icon + text)" option from your annotation. If you'd rather compare 2–3 visual variants first (the "ChatGPT ideas" note), say so and Task 6 becomes a mockup round instead.
2. **Admin label:** the admin candidate view says "First contact" — the plan renames it too for consistency. Veto if admins should keep the old wording.
3. **Guarantee data repair:** logic fixes are in scope; repairing stale demo placements in prod (if the diagnostic SQL finds any) is a separate decision after you run the query.
