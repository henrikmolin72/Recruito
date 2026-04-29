# Client fee re-confirmation flow — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When admin raises `client_fee_amount` above what the client ticked at declaration, gate publish behind explicit client re-confirmation; otherwise publish unchanged.

**Architecture:** New status `pending_client_reconfirm` plus seven columns on `jobs` capturing baseline estimate, proposed amount, reason, and decision history. Two admin server actions (`request*`, `withdraw*`) and two company server actions (`clientApprove*`, `clientReject*`). UI surfaces: declaration disclaimer, admin approve modal, admin withdraw button, company re-confirm card on job detail, dashboard banner. Email + in-app notification on transition.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres, Server Actions, Tailwind, sonner, existing `sendUserEmail` + `createNotification` helpers, i18n via JSON dictionaries (en/sv/no/da).

**Spec:** [`docs/superpowers/specs/2026-04-29-fee-reconfirm-design.md`](../specs/2026-04-29-fee-reconfirm-design.md)

**Branch:** `fix/client-feedback-batch-2`

**Verification convention:** This repo has no JS test runner. Each task ends with `npm run build` (run from `rekryteringsplattform/`) for type/build verification. End-of-plan task runs the manual UAT matrix.

---

## File structure

**Created:**
- `rekryteringsplattform/supabase/migrations/034_client_fee_reconfirm.sql` — schema + backfill
- `rekryteringsplattform/src/lib/fee-reconfirm.ts` — pure helpers: reason enum, label keys, currency-safe diff
- `rekryteringsplattform/src/components/dashboard/admin/approve-job-modal.tsx` — client component, opens uplift modal
- `rekryteringsplattform/src/components/dashboard/admin/withdraw-reconfirm-button.tsx`
- `rekryteringsplattform/src/components/dashboard/company/fee-reconfirm-card.tsx`
- `rekryteringsplattform/src/components/dashboard/company/reconfirm-banner.tsx`

**Modified:**
- `src/types/db-types.ts` — `JobStatus` union, `Job` interface
- `src/lib/actions/jobs.ts` — `createJob` snapshot, two new client-side actions
- `src/lib/actions/admin.ts` — two new admin actions, `getAdminJobs` selects + maps new columns
- `src/lib/email/email-templates.ts` — new `feeReconfirmEmail`
- `src/components/dashboard/admin/approve-job-button.tsx` — replaced by the modal wrapper
- `src/app/(dashboard)/admin/jobs/page.tsx` — wire new modal + withdraw
- `src/app/(dashboard)/company/jobs/[id]/page.tsx` — render re-confirm card when status matches
- `src/app/(dashboard)/company/layout.tsx` — mount banner
- `src/app/(dashboard)/company/jobs/new/create-job-form.tsx` — add disclaimer line under fee
- `src/i18n/dictionaries/{en,sv,no,da}.json` — new keys

---

## Task 1: Migration — schema + backfill

**Files:**
- Create: `rekryteringsplattform/supabase/migrations/034_client_fee_reconfirm.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 034_client_fee_reconfirm.sql
-- Client fee re-confirmation flow. Adds the consent state around client_fee_amount.
-- Pattern for adding enum value follows migration 030_process_flow_gates.sql.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'job_status'::regtype
          AND enumlabel = 'pending_client_reconfirm'
    ) THEN
        ALTER TYPE job_status ADD VALUE 'pending_client_reconfirm' AFTER 'pending_approval';
    END IF;
END $$;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS client_fee_amount_estimated numeric,
    ADD COLUMN IF NOT EXISTS client_fee_amount_proposed numeric,
    ADD COLUMN IF NOT EXISTS client_fee_uplift_reason text,
    ADD COLUMN IF NOT EXISTS client_fee_uplift_note text,
    ADD COLUMN IF NOT EXISTS client_fee_reconfirm_requested_at timestamptz,
    ADD COLUMN IF NOT EXISTS client_fee_reconfirm_resolved_at timestamptz,
    ADD COLUMN IF NOT EXISTS client_fee_reconfirm_decision text;

-- Backfill: any pending_approval row gets a baseline equal to its current locked fee.
-- Active/closed/draft rows are out of scope for the gate.
UPDATE jobs
SET client_fee_amount_estimated = client_fee_amount
WHERE status = 'pending_approval'
  AND client_fee_amount_estimated IS NULL
  AND client_fee_amount IS NOT NULL;

COMMENT ON COLUMN jobs.client_fee_amount_estimated IS
    'Fee the client ticked the declaration for. Set once on submit. Never mutated.';
COMMENT ON COLUMN jobs.client_fee_amount_proposed IS
    'Higher amount admin wants to charge. Set on entering pending_client_reconfirm. Cleared on resolve.';
COMMENT ON COLUMN jobs.client_fee_uplift_reason IS
    'One of: hard_to_fill, niche_specialist, senior_executive, urgent_timeline, custom. App-validated.';
COMMENT ON COLUMN jobs.client_fee_reconfirm_decision IS
    'Latest outcome: approved | rejected | withdrawn. Full history lives in notifications.';
```

- [ ] **Step 2: Sanity-check the SQL parses locally**

If you have a local Supabase, run:
```bash
cd rekryteringsplattform && npx supabase db reset --linked 2>&1 | tail -20
```
Expected: migration applies cleanly. If you don't have a local DB, skip — the type check in later tasks will catch column reference errors via the TS types we add next.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/supabase/migrations/034_client_fee_reconfirm.sql
git commit -m "feat(db): add client fee re-confirmation columns"
```

---

## Task 2: TypeScript types

**Files:**
- Modify: `rekryteringsplattform/src/types/db-types.ts`

- [ ] **Step 1: Extend `JobStatus` union and the `Job` interface**

Open `src/types/db-types.ts:2`. Replace the line:
```ts
export type JobStatus = 'draft' | 'active' | 'paused' | 'filled' | 'closed' | 'cancelled';
```
with:
```ts
export type JobStatus = 'draft' | 'pending_approval' | 'pending_client_reconfirm' | 'active' | 'paused' | 'filled' | 'closed' | 'cancelled';

export type ClientFeeUpliftReason =
    | 'hard_to_fill'
    | 'niche_specialist'
    | 'senior_executive'
    | 'urgent_timeline'
    | 'custom';

export type ClientFeeReconfirmDecision = 'approved' | 'rejected' | 'withdrawn';
```

(Note: `pending_approval` was previously implicit in the codebase; this makes both pending values explicit.)

In the `Job` interface, after the `recruiter_fee_percentage?` line, add:
```ts
    client_fee_amount_estimated: number | null;
    client_fee_amount_proposed: number | null;
    client_fee_uplift_reason: ClientFeeUpliftReason | null;
    client_fee_uplift_note: string | null;
    client_fee_reconfirm_requested_at: string | null;
    client_fee_reconfirm_resolved_at: string | null;
    client_fee_reconfirm_decision: ClientFeeReconfirmDecision | null;
```

- [ ] **Step 2: Type-check**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -20
```
Expected: PASS. (No callers reference the new fields yet.) If a status check anywhere does `===` against the old `JobStatus`, TS will flag it — fix the assertion sites by widening the comparison, do not narrow the type.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/src/types/db-types.ts
git commit -m "feat(types): add fee re-confirmation fields to Job"
```

---

## Task 3: Pure helper module

**Files:**
- Create: `rekryteringsplattform/src/lib/fee-reconfirm.ts`

- [ ] **Step 1: Write the helper**

```ts
// rekryteringsplattform/src/lib/fee-reconfirm.ts
import type { ClientFeeUpliftReason } from "@/types/db-types";

export const CLIENT_FEE_UPLIFT_REASONS: ClientFeeUpliftReason[] = [
    'hard_to_fill',
    'niche_specialist',
    'senior_executive',
    'urgent_timeline',
    'custom',
];

export function isValidUpliftReason(v: unknown): v is ClientFeeUpliftReason {
    return typeof v === 'string' && (CLIENT_FEE_UPLIFT_REASONS as string[]).includes(v);
}

// i18n key for a given reason. Dictionary keys live under feeReconfirm.reason.<value>.
export function reasonI18nKey(reason: ClientFeeUpliftReason): string {
    return `feeReconfirm.reason.${reason}`;
}

// Returns true if the gate must fire for these two amounts. Currency-agnostic;
// caller is responsible for ensuring both numbers are in the same currency.
export function requiresReconfirm(estimated: number | null, finalAmount: number | null): boolean {
    if (estimated == null || finalAmount == null) return false;
    return finalAmount > estimated;
}
```

- [ ] **Step 2: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -10
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/src/lib/fee-reconfirm.ts
git commit -m "feat: fee re-confirm helper module"
```

---

## Task 4: i18n keys (all four dictionaries)

**Files:**
- Modify: `rekryteringsplattform/src/i18n/dictionaries/{en,sv,no,da}.json`

- [ ] **Step 1: Add a `feeReconfirm` block to en.json**

Find the closing `}` of the top-level object in `en.json`. Just before it, insert (with a leading comma on the previous closing brace if needed):
```json
  "feeReconfirm": {
    "declarationDisclaimer": "This is an estimate. If we adjust it during review, we will ask you to re-confirm before publishing.",
    "bannerSingular": "{count} job needs your re-confirmation",
    "bannerPlural": "{count} jobs need your re-confirmation",
    "cardTitle": "Fee re-confirmation needed",
    "cardOriginal": "Original estimate",
    "cardProposed": "Proposed final fee",
    "cardDelta": "Change",
    "cardReason": "Reason",
    "cardNote": "Admin note",
    "cardApprove": "Approve new fee",
    "cardReject": "Reject",
    "cardApproved": "New fee approved.",
    "cardRejected": "Fee rejected. Recruito will follow up.",
    "adminApproveLabelDefault": "Approve",
    "adminApproveLabelUplift": "Approve & request client re-confirm",
    "adminWithdrawButton": "Withdraw to original",
    "adminAwaitingClient": "Awaiting client re-confirm (sent {date})",
    "modalTitle": "Request client re-confirmation",
    "modalReasonLabel": "Reason for fee increase",
    "modalNoteLabel": "Optional note (required if reason is Custom)",
    "modalSubmit": "Send request",
    "modalCancel": "Cancel",
    "emailSubject": "Fee re-confirmation needed for {jobTitle}",
    "reason": {
      "hard_to_fill": "Hard-to-fill role",
      "niche_specialist": "Niche / specialist market",
      "senior_executive": "Senior / executive level",
      "urgent_timeline": "Urgent timeline",
      "custom": "Other (see note)"
    },
    "errors": {
      "noteRequiredForCustom": "Please add a note explaining the custom reason.",
      "notWaiting": "This job is no longer awaiting re-confirmation.",
      "feeNotIncreased": "Final fee is not higher than the original estimate."
    }
  }
```

- [ ] **Step 2: Add the same block to sv.json with Swedish copy**

```json
  "feeReconfirm": {
    "declarationDisclaimer": "Detta är en uppskattning. Om vi justerar avgiften under granskningen ber vi dig bekräfta den nya summan innan jobbet publiceras.",
    "bannerSingular": "{count} jobb behöver din bekräftelse",
    "bannerPlural": "{count} jobb behöver din bekräftelse",
    "cardTitle": "Avgiftsbekräftelse krävs",
    "cardOriginal": "Ursprunglig uppskattning",
    "cardProposed": "Föreslagen slutlig avgift",
    "cardDelta": "Förändring",
    "cardReason": "Anledning",
    "cardNote": "Notering från Recruito",
    "cardApprove": "Godkänn ny avgift",
    "cardReject": "Avvisa",
    "cardApproved": "Ny avgift godkänd.",
    "cardRejected": "Avgift avvisad. Recruito återkommer.",
    "adminApproveLabelDefault": "Godkänn",
    "adminApproveLabelUplift": "Godkänn & be kund bekräfta",
    "adminWithdrawButton": "Återgå till ursprunglig",
    "adminAwaitingClient": "Väntar på kundbekräftelse (skickat {date})",
    "modalTitle": "Begär kundbekräftelse",
    "modalReasonLabel": "Anledning till höjning",
    "modalNoteLabel": "Valfri notering (krävs om Anledning är Övrigt)",
    "modalSubmit": "Skicka begäran",
    "modalCancel": "Avbryt",
    "emailSubject": "Avgiftsbekräftelse krävs för {jobTitle}",
    "reason": {
      "hard_to_fill": "Svårtillsatt roll",
      "niche_specialist": "Nisch / specialist",
      "senior_executive": "Senior / ledningsnivå",
      "urgent_timeline": "Brådskande tidsplan",
      "custom": "Övrigt (se notering)"
    },
    "errors": {
      "noteRequiredForCustom": "Ange en notering som förklarar den anpassade anledningen.",
      "notWaiting": "Det här jobbet väntar inte längre på bekräftelse.",
      "feeNotIncreased": "Slutavgiften är inte högre än uppskattningen."
    }
  }
```

- [ ] **Step 3: Add the same block to no.json (Norwegian)**

```json
  "feeReconfirm": {
    "declarationDisclaimer": "Dette er et estimat. Hvis vi justerer avgiften under gjennomgang, ber vi deg bekrefte den nye summen før jobben publiseres.",
    "bannerSingular": "{count} jobb trenger din bekreftelse",
    "bannerPlural": "{count} jobber trenger din bekreftelse",
    "cardTitle": "Avgiftsbekreftelse nødvendig",
    "cardOriginal": "Opprinnelig estimat",
    "cardProposed": "Foreslått endelig avgift",
    "cardDelta": "Endring",
    "cardReason": "Grunn",
    "cardNote": "Notat fra Recruito",
    "cardApprove": "Godkjenn ny avgift",
    "cardReject": "Avvis",
    "cardApproved": "Ny avgift godkjent.",
    "cardRejected": "Avgift avvist. Recruito tar kontakt.",
    "adminApproveLabelDefault": "Godkjenn",
    "adminApproveLabelUplift": "Godkjenn & be kunde bekrefte",
    "adminWithdrawButton": "Tilbake til opprinnelig",
    "adminAwaitingClient": "Venter på kundebekreftelse (sendt {date})",
    "modalTitle": "Be om kundebekreftelse",
    "modalReasonLabel": "Grunn til økning",
    "modalNoteLabel": "Valgfritt notat (påkrevd hvis Grunn er Annet)",
    "modalSubmit": "Send forespørsel",
    "modalCancel": "Avbryt",
    "emailSubject": "Avgiftsbekreftelse nødvendig for {jobTitle}",
    "reason": {
      "hard_to_fill": "Vanskelig rolle å fylle",
      "niche_specialist": "Nisje / spesialist",
      "senior_executive": "Senior / ledernivå",
      "urgent_timeline": "Hastetidslinje",
      "custom": "Annet (se notat)"
    },
    "errors": {
      "noteRequiredForCustom": "Legg til et notat som forklarer den egendefinerte grunnen.",
      "notWaiting": "Denne jobben venter ikke lenger på bekreftelse.",
      "feeNotIncreased": "Den endelige avgiften er ikke høyere enn estimatet."
    }
  }
```

- [ ] **Step 4: Add the same block to da.json (Danish)**

```json
  "feeReconfirm": {
    "declarationDisclaimer": "Dette er et estimat. Hvis vi justerer gebyret under gennemgangen, beder vi dig bekræfte det nye beløb, før jobbet offentliggøres.",
    "bannerSingular": "{count} job kræver din bekræftelse",
    "bannerPlural": "{count} job kræver din bekræftelse",
    "cardTitle": "Bekræftelse af gebyr kræves",
    "cardOriginal": "Oprindeligt estimat",
    "cardProposed": "Foreslået endeligt gebyr",
    "cardDelta": "Ændring",
    "cardReason": "Begrundelse",
    "cardNote": "Note fra Recruito",
    "cardApprove": "Godkend nyt gebyr",
    "cardReject": "Afvis",
    "cardApproved": "Nyt gebyr godkendt.",
    "cardRejected": "Gebyr afvist. Recruito vender tilbage.",
    "adminApproveLabelDefault": "Godkend",
    "adminApproveLabelUplift": "Godkend & bed kunde bekræfte",
    "adminWithdrawButton": "Tilbage til oprindeligt",
    "adminAwaitingClient": "Afventer kundebekræftelse (sendt {date})",
    "modalTitle": "Anmod om kundebekræftelse",
    "modalReasonLabel": "Årsag til stigning",
    "modalNoteLabel": "Valgfri note (kræves hvis Årsag er Andet)",
    "modalSubmit": "Send anmodning",
    "modalCancel": "Annullér",
    "emailSubject": "Bekræftelse af gebyr kræves for {jobTitle}",
    "reason": {
      "hard_to_fill": "Svær at besætte",
      "niche_specialist": "Niche / specialist",
      "senior_executive": "Senior / ledelsesniveau",
      "urgent_timeline": "Akut tidslinje",
      "custom": "Andet (se note)"
    },
    "errors": {
      "noteRequiredForCustom": "Tilføj en note der forklarer den brugerdefinerede årsag.",
      "notWaiting": "Dette job afventer ikke længere bekræftelse.",
      "feeNotIncreased": "Det endelige gebyr er ikke højere end estimatet."
    }
  }
```

- [ ] **Step 5: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -10
```
Expected: PASS. JSON parsing errors will surface here. Fix any trailing-comma issues you introduced.

- [ ] **Step 6: Commit**

```bash
git add rekryteringsplattform/src/i18n/dictionaries/
git commit -m "i18n: fee re-confirmation copy in en/sv/no/da"
```

---

## Task 5: `createJob` snapshots `client_fee_amount_estimated`

**Files:**
- Modify: `rekryteringsplattform/src/lib/actions/jobs.ts`

- [ ] **Step 1: Snapshot the estimate when status moves to `pending_approval`**

Find the `jobPayload` block (around line 144). Locate the existing line:
```ts
        client_fee_amount: lockedClientFee,
```
Replace with:
```ts
        client_fee_amount: lockedClientFee,
        // Snapshot the baseline once at submission. Drafts get NULL; the estimate is
        // recorded the moment the row leaves draft. Per the design, this column is
        // written exactly once and never recomputed thereafter.
        client_fee_amount_estimated: isDraft ? null : lockedClientFee,
```

- [ ] **Step 2: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -10
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/src/lib/actions/jobs.ts
git commit -m "feat: snapshot estimated client fee on submit"
```

---

## Task 6: Email template

**Files:**
- Modify: `rekryteringsplattform/src/lib/email/email-templates.ts`

- [ ] **Step 1: Add the new template**

Append at the bottom of `email-templates.ts`:
```ts
// Sent to the company when admin raises client_fee_amount above the estimated
// baseline and clicks Approve. Plain-text only; deep-links to the job detail.
export function feeReconfirmEmail({
    jobTitle,
    originalAmount,
    proposedAmount,
    currency,
    reasonLabel,
    note,
    jobUrl,
}: {
    jobTitle: string;
    originalAmount: number;
    proposedAmount: number;
    currency: string;
    reasonLabel: string;
    note?: string | null;
    jobUrl: string;
}) {
    const fmt = (n: number) =>
        new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
    const lines = [
        `We've reviewed your job "${jobTitle}" and propose a higher fee.`,
        ``,
        `Original estimate: ${fmt(originalAmount)} ${currency}`,
        `Proposed final fee: ${fmt(proposedAmount)} ${currency}`,
        `Reason: ${reasonLabel}`,
    ];
    if (note && note.trim()) lines.push(`Note: ${note.trim()}`);
    lines.push(``, `Please review and approve or reject in the dashboard:`, jobUrl);
    return {
        subject: `Fee re-confirmation needed for ${jobTitle}`,
        text: lines.join("\n"),
    };
}
```

- [ ] **Step 2: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -10
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/src/lib/email/email-templates.ts
git commit -m "feat(email): fee re-confirmation template"
```

---

## Task 7: Admin server action — `requestClientFeeReconfirm`

**Files:**
- Modify: `rekryteringsplattform/src/lib/actions/admin.ts`

- [ ] **Step 1: Add imports**

At the top of `src/lib/actions/admin.ts`, add (next to existing imports):
```ts
import { isValidUpliftReason, reasonI18nKey } from "@/lib/fee-reconfirm";
import { feeReconfirmEmail } from "@/lib/email/email-templates";
import { sendUserEmail } from "@/lib/email/internal-notifications";
import { createNotification } from "@/lib/actions/notifications";
import { getDictionary } from "@/i18n/server";
import type { ClientFeeUpliftReason } from "@/types/db-types";
```

(Skip any that already exist — TS will flag duplicates, just remove them.)

- [ ] **Step 2: Add `requestClientFeeReconfirm`**

Append below the existing `updateRecruiterFeeAmount` action:
```ts
// Called from the admin Approve modal when client_fee_amount is higher than
// client_fee_amount_estimated. Atomic: validates, transitions status, writes
// proposal columns, sends in-app notification + email. Status guard prevents
// races with parallel admin actions.
export async function requestClientFeeReconfirm(
    jobId: string,
    reason: ClientFeeUpliftReason,
    note?: string | null,
) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    if (!isValidUpliftReason(reason)) {
        return { error: "Invalid reason" };
    }
    const trimmedNote = (note ?? "").trim() || null;
    if (reason === "custom" && !trimmedNote) {
        return { error: "Note required for custom reason" };
    }

    const { data: job } = await supabaseAdmin
        .from("jobs")
        .select(
            "id, status, title, salary_currency, client_fee_amount, client_fee_amount_estimated, company_id"
        )
        .eq("id", jobId)
        .single();

    if (!job) return { error: "Job not found" };
    if (job.status !== "pending_approval" && job.status !== "pending_client_reconfirm") {
        return { error: "Job is not in a re-confirmable state" };
    }
    if (
        job.client_fee_amount == null ||
        job.client_fee_amount_estimated == null ||
        Number(job.client_fee_amount) <= Number(job.client_fee_amount_estimated)
    ) {
        return { error: "Final fee is not higher than the estimate" };
    }

    const { error: updateError } = await supabaseAdmin
        .from("jobs")
        .update({
            status: "pending_client_reconfirm",
            client_fee_amount_proposed: job.client_fee_amount,
            client_fee_uplift_reason: reason,
            client_fee_uplift_note: trimmedNote,
            client_fee_reconfirm_requested_at: new Date().toISOString(),
            // Wipe any prior decision/resolved_at so the row state is clean.
            client_fee_reconfirm_resolved_at: null,
            client_fee_reconfirm_decision: null,
        })
        .eq("id", jobId)
        .in("status", ["pending_approval", "pending_client_reconfirm"]);

    if (updateError) {
        console.error("[requestClientFeeReconfirm]", updateError);
        return { error: "Could not request re-confirmation" };
    }

    // Notify the company owner (in-app + email). Best-effort; log but do not fail
    // the action if notification dispatch errors.
    try {
        const { data: company } = await supabaseAdmin
            .from("companies")
            .select("user_id")
            .eq("id", job.company_id)
            .single();
        if (company?.user_id) {
            const dict = await getDictionary();
            const reasonLabel =
                (dict as any)?.feeReconfirm?.reason?.[reason] ?? reasonI18nKey(reason);
            const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/company/jobs/${jobId}`;
            await createNotification(
                company.user_id,
                (dict as any)?.feeReconfirm?.cardTitle ?? "Fee re-confirmation needed",
                `${job.title}`,
                `/company/jobs/${jobId}`,
            );
            const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("email")
                .eq("id", company.user_id)
                .single();
            if (profile?.email) {
                const tmpl = feeReconfirmEmail({
                    jobTitle: job.title,
                    originalAmount: Number(job.client_fee_amount_estimated),
                    proposedAmount: Number(job.client_fee_amount),
                    currency: job.salary_currency || "EUR",
                    reasonLabel,
                    note: trimmedNote,
                    jobUrl,
                });
                await sendUserEmail({ to: profile.email, subject: tmpl.subject, text: tmpl.text });
            }
        }
    } catch (err) {
        console.error("[requestClientFeeReconfirm] notify failed", err);
    }

    revalidatePath("/admin/jobs");
    revalidatePath(`/company/jobs/${jobId}`);
    return { success: true as const };
}
```

- [ ] **Step 3: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -15
```
Expected: PASS. If `getDictionary` import path is different in this codebase, adjust to match what other admin actions use.

- [ ] **Step 4: Commit**

```bash
git add rekryteringsplattform/src/lib/actions/admin.ts
git commit -m "feat: requestClientFeeReconfirm admin action"
```

---

## Task 8: Admin server action — `withdrawClientFeeReconfirm`

**Files:**
- Modify: `rekryteringsplattform/src/lib/actions/admin.ts`

- [ ] **Step 1: Add the action**

Append below `requestClientFeeReconfirm`:
```ts
// One-click revert. Restores client_fee_amount to the estimated baseline,
// clears the proposal, marks decision='withdrawn', publishes the job.
export async function withdrawClientFeeReconfirm(jobId: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data: job } = await supabaseAdmin
        .from("jobs")
        .select("id, status, client_fee_amount_estimated, published_at")
        .eq("id", jobId)
        .single();

    if (!job) return { error: "Job not found" };
    if (job.status !== "pending_client_reconfirm") {
        return { error: "Job is not awaiting re-confirmation" };
    }
    if (job.client_fee_amount_estimated == null) {
        return { error: "No baseline estimate to revert to" };
    }

    const { error } = await supabaseAdmin
        .from("jobs")
        .update({
            status: "active",
            client_fee_amount: job.client_fee_amount_estimated,
            client_fee_amount_proposed: null,
            client_fee_uplift_reason: null,
            client_fee_uplift_note: null,
            client_fee_reconfirm_resolved_at: new Date().toISOString(),
            client_fee_reconfirm_decision: "withdrawn",
            published_at: job.published_at ?? new Date().toISOString(),
        })
        .eq("id", jobId)
        .eq("status", "pending_client_reconfirm");

    if (error) {
        console.error("[withdrawClientFeeReconfirm]", error);
        return { error: "Could not withdraw re-confirmation" };
    }

    revalidatePath("/admin/jobs");
    revalidatePath(`/company/jobs/${jobId}`);
    return { success: true as const };
}
```

- [ ] **Step 2: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -10
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/src/lib/actions/admin.ts
git commit -m "feat: withdrawClientFeeReconfirm admin action"
```

---

## Task 9: Admin `getAdminJobs` returns the new fields

**Files:**
- Modify: `rekryteringsplattform/src/lib/actions/admin.ts`

- [ ] **Step 1: Extend the select + map**

In the `select(\`...\`)` of `getAdminJobs`, after `recruiter_fee_percentage,` add:
```sql
            client_fee_amount_estimated,
            client_fee_amount_proposed,
            client_fee_uplift_reason,
            client_fee_uplift_note,
            client_fee_reconfirm_requested_at,
            client_fee_reconfirm_resolved_at,
            client_fee_reconfirm_decision,
```

In the mapped return object (next to `clientFeeAmount`), add:
```ts
            clientFeeEstimated: job.client_fee_amount_estimated != null ? Number(job.client_fee_amount_estimated) : null,
            clientFeeProposed: job.client_fee_amount_proposed != null ? Number(job.client_fee_amount_proposed) : null,
            upliftReason: job.client_fee_uplift_reason ?? null,
            upliftNote: job.client_fee_uplift_note ?? null,
            reconfirmRequestedAt: job.client_fee_reconfirm_requested_at ?? null,
            reconfirmDecision: job.client_fee_reconfirm_decision ?? null,
```

- [ ] **Step 2: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -10
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/src/lib/actions/admin.ts
git commit -m "feat(admin): expose re-confirm fields in getAdminJobs"
```

---

## Task 10: Company server actions — `clientApproveProposedFee`, `clientRejectProposedFee`

**Files:**
- Modify: `rekryteringsplattform/src/lib/actions/jobs.ts`

- [ ] **Step 1: Add imports**

Near the existing imports in `jobs.ts`:
```ts
import { sendUserEmail } from "@/lib/email/internal-notifications";
import { createNotification } from "@/lib/actions/notifications";
```

(Skip if already present.)

- [ ] **Step 2: Add the actions**

Append at the bottom of `jobs.ts`:
```ts
// Company-side: accept the higher fee. Status guard prevents race with admin
// withdraw or repeated client clicks. Reuses notifyMatchingRecruitersAboutJob
// since the job is now eligible to be visible to recruiters.
export async function clientApproveProposedFee(jobId: string) {
    const { error: authError, supabase, user } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };
    if (!user) return { error: "Ej inloggad" };

    const { data: job } = await supabase
        .from("jobs")
        .select("id, status, client_fee_amount_proposed, published_at, title")
        .eq("id", jobId)
        .single();
    if (!job) return { error: "Job not found" };
    if (job.status !== "pending_client_reconfirm") {
        return { error: "Job is no longer awaiting re-confirmation" };
    }
    if (job.client_fee_amount_proposed == null) {
        return { error: "No proposed amount on file" };
    }

    const { error } = await supabase
        .from("jobs")
        .update({
            status: "active",
            client_fee_amount: job.client_fee_amount_proposed,
            client_fee_amount_proposed: null,
            client_fee_reconfirm_resolved_at: new Date().toISOString(),
            client_fee_reconfirm_decision: "approved",
            published_at: job.published_at ?? new Date().toISOString(),
        })
        .eq("id", jobId)
        .eq("status", "pending_client_reconfirm");

    if (error) {
        console.error("[clientApproveProposedFee]", error);
        return { error: "Could not approve. Please try again." };
    }

    await notifyMatchingRecruitersAboutJob(jobId);

    revalidatePath("/company/jobs");
    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/admin/jobs");
    return { success: true as const };
}

// Company-side: reject the higher fee. Routes back to pending_approval; admin
// can revise the fee or withdraw.
export async function clientRejectProposedFee(jobId: string) {
    const { error: authError, supabase, user } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };
    if (!user) return { error: "Ej inloggad" };

    const { data: job } = await supabase
        .from("jobs")
        .select("id, status")
        .eq("id", jobId)
        .single();
    if (!job) return { error: "Job not found" };
    if (job.status !== "pending_client_reconfirm") {
        return { error: "Job is no longer awaiting re-confirmation" };
    }

    const { error } = await supabase
        .from("jobs")
        .update({
            status: "pending_approval",
            client_fee_amount_proposed: null,
            client_fee_uplift_reason: null,
            client_fee_uplift_note: null,
            client_fee_reconfirm_resolved_at: new Date().toISOString(),
            client_fee_reconfirm_decision: "rejected",
        })
        .eq("id", jobId)
        .eq("status", "pending_client_reconfirm");

    if (error) {
        console.error("[clientRejectProposedFee]", error);
        return { error: "Could not reject. Please try again." };
    }

    revalidatePath("/company/jobs");
    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/admin/jobs");
    return { success: true as const };
}
```

- [ ] **Step 3: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -15
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add rekryteringsplattform/src/lib/actions/jobs.ts
git commit -m "feat: client approve/reject proposed fee actions"
```

---

## Task 11: Admin approve modal component

**Files:**
- Create: `rekryteringsplattform/src/components/dashboard/admin/approve-job-modal.tsx`

- [ ] **Step 1: Write the modal**

```tsx
"use client";

import { useState } from "react";
import { approveJob } from "@/lib/actions/jobs";
import { requestClientFeeReconfirm } from "@/lib/actions/admin";
import { CLIENT_FEE_UPLIFT_REASONS } from "@/lib/fee-reconfirm";
import type { ClientFeeUpliftReason } from "@/types/db-types";
import { useTranslations } from "@/i18n/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
    jobId: string;
    status: string;
    requiresUplift: boolean; // client_fee_amount > client_fee_amount_estimated
}

export function ApproveJobModal({ jobId, status, requiresUplift }: Props) {
    const { t } = useTranslations();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<ClientFeeUpliftReason>("hard_to_fill");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    if (status !== "pending_approval") return null;

    async function handlePlainApprove() {
        setBusy(true);
        const r = await approveJob(jobId);
        setBusy(false);
        if (r?.error) toast.error(r.error);
        else toast.success("Approved");
    }

    async function handleUpliftSubmit() {
        if (reason === "custom" && !note.trim()) {
            toast.error(t("feeReconfirm.errors.noteRequiredForCustom"));
            return;
        }
        setBusy(true);
        const r = await requestClientFeeReconfirm(jobId, reason, note.trim() || null);
        setBusy(false);
        if (r?.error) {
            toast.error(r.error);
        } else {
            toast.success("Re-confirmation requested");
            setOpen(false);
        }
    }

    if (!requiresUplift) {
        return (
            <Button size="sm" disabled={busy} onClick={handlePlainApprove}>
                {t("feeReconfirm.adminApproveLabelDefault")}
            </Button>
        );
    }

    return (
        <>
            <Button size="sm" variant="default" disabled={busy} onClick={() => setOpen(true)}>
                {t("feeReconfirm.adminApproveLabelUplift")}
            </Button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-[420px] max-w-[90vw] space-y-4">
                        <h3 className="font-bold text-lg">{t("feeReconfirm.modalTitle")}</h3>
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase text-slate-500">
                                {t("feeReconfirm.modalReasonLabel")}
                            </span>
                            <select
                                className="w-full rounded border border-slate-200 p-2"
                                value={reason}
                                onChange={(e) => setReason(e.target.value as ClientFeeUpliftReason)}
                            >
                                {CLIENT_FEE_UPLIFT_REASONS.map((r) => (
                                    <option key={r} value={r}>
                                        {t(`feeReconfirm.reason.${r}`)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase text-slate-500">
                                {t("feeReconfirm.modalNoteLabel")}
                            </span>
                            <textarea
                                className="w-full rounded border border-slate-200 p-2 min-h-[80px]"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </label>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                                {t("feeReconfirm.modalCancel")}
                            </Button>
                            <Button onClick={handleUpliftSubmit} disabled={busy}>
                                {t("feeReconfirm.modalSubmit")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
```

- [ ] **Step 2: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -15
```
Expected: PASS. If `useTranslations`/`Button` import paths are different, copy from `recruiter-fee-editor.tsx`.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/src/components/dashboard/admin/approve-job-modal.tsx
git commit -m "feat(admin): approve modal with uplift reason flow"
```

---

## Task 12: Admin withdraw button

**Files:**
- Create: `rekryteringsplattform/src/components/dashboard/admin/withdraw-reconfirm-button.tsx`

- [ ] **Step 1: Write the button**

```tsx
"use client";

import { useState } from "react";
import { withdrawClientFeeReconfirm } from "@/lib/actions/admin";
import { useTranslations } from "@/i18n/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function WithdrawReconfirmButton({ jobId }: { jobId: string }) {
    const { t } = useTranslations();
    const [busy, setBusy] = useState(false);
    return (
        <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={async () => {
                setBusy(true);
                const r = await withdrawClientFeeReconfirm(jobId);
                setBusy(false);
                if (r?.error) toast.error(r.error);
                else toast.success("Withdrawn");
            }}
        >
            {t("feeReconfirm.adminWithdrawButton")}
        </Button>
    );
}
```

- [ ] **Step 2: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -10
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/src/components/dashboard/admin/withdraw-reconfirm-button.tsx
git commit -m "feat(admin): withdraw re-confirm button"
```

---

## Task 13: Wire admin jobs page to the new components

**Files:**
- Modify: `rekryteringsplattform/src/app/(dashboard)/admin/jobs/page.tsx`

- [ ] **Step 1: Replace approval cell**

Open the file. Find the import block and add:
```ts
import { ApproveJobModal } from "@/components/dashboard/admin/approve-job-modal";
import { WithdrawReconfirmButton } from "@/components/dashboard/admin/withdraw-reconfirm-button";
import { formatDateShort } from "@/lib/utils";
```

Find the `<ApproveJobButton ... />` cell (search `ApproveJobButton`). Replace that `<td>...</td>` with:
```tsx
                    <td className="p-4">
                      {job.status === "pending_approval" && (
                        <ApproveJobModal
                          jobId={job.id}
                          status={job.status}
                          requiresUplift={
                            job.clientFeeAmount != null &&
                            job.clientFeeEstimated != null &&
                            Number(job.clientFeeAmount) > Number(job.clientFeeEstimated)
                          }
                        />
                      )}
                      {job.status === "pending_client_reconfirm" && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Awaiting client re-confirm
                            {job.reconfirmRequestedAt
                              ? ` (sent ${formatDateShort(job.reconfirmRequestedAt)})`
                              : ""}
                          </p>
                          <WithdrawReconfirmButton jobId={job.id} />
                        </div>
                      )}
                    </td>
```

Remove the now-unused `ApproveJobButton` import line if no other cell uses it.

- [ ] **Step 2: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -15
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/src/app/(dashboard)/admin/jobs/page.tsx
git commit -m "feat(admin): wire fee re-confirm modal + withdraw"
```

---

## Task 14: Company re-confirm card

**Files:**
- Create: `rekryteringsplattform/src/components/dashboard/company/fee-reconfirm-card.tsx`

- [ ] **Step 1: Write the card**

```tsx
"use client";

import { useState } from "react";
import { clientApproveProposedFee, clientRejectProposedFee } from "@/lib/actions/jobs";
import { useTranslations } from "@/i18n/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { ClientFeeUpliftReason } from "@/types/db-types";

interface Props {
    jobId: string;
    estimated: number;
    proposed: number;
    currency: string;
    reason: ClientFeeUpliftReason | null;
    note: string | null;
}

export function FeeReconfirmCard({ jobId, estimated, proposed, currency, reason, note }: Props) {
    const { t } = useTranslations();
    const [busy, setBusy] = useState(false);
    const delta = proposed - estimated;
    const pct = estimated > 0 ? Math.round((delta / estimated) * 100) : 0;

    async function approve() {
        setBusy(true);
        const r = await clientApproveProposedFee(jobId);
        setBusy(false);
        if (r?.error) toast.error(r.error);
        else toast.success(t("feeReconfirm.cardApproved"));
    }
    async function reject() {
        setBusy(true);
        const r = await clientRejectProposedFee(jobId);
        setBusy(false);
        if (r?.error) toast.error(r.error);
        else toast.success(t("feeReconfirm.cardRejected"));
    }

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 space-y-4">
            <h3 className="font-bold text-lg text-amber-900">{t("feeReconfirm.cardTitle")}</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">{t("feeReconfirm.cardOriginal")}</p>
                    <p className="font-bold">{formatCurrency(estimated, currency)}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">{t("feeReconfirm.cardProposed")}</p>
                    <p className="font-bold text-amber-700">{formatCurrency(proposed, currency)}</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">{t("feeReconfirm.cardDelta")}</p>
                    <p className="font-bold">+{formatCurrency(delta, currency)} ({pct}%)</p>
                </div>
            </div>
            {reason && (
                <div className="text-sm">
                    <p className="text-xs uppercase tracking-wider text-slate-500">{t("feeReconfirm.cardReason")}</p>
                    <p>{t(`feeReconfirm.reason.${reason}`)}</p>
                </div>
            )}
            {note && (
                <div className="text-sm">
                    <p className="text-xs uppercase tracking-wider text-slate-500">{t("feeReconfirm.cardNote")}</p>
                    <p className="whitespace-pre-line">{note}</p>
                </div>
            )}
            <div className="flex gap-2 pt-2">
                <Button onClick={approve} disabled={busy}>{t("feeReconfirm.cardApprove")}</Button>
                <Button variant="outline" onClick={reject} disabled={busy}>{t("feeReconfirm.cardReject")}</Button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -10
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/src/components/dashboard/company/fee-reconfirm-card.tsx
git commit -m "feat(company): fee re-confirm card"
```

---

## Task 15: Mount the card on the company job detail page

**Files:**
- Modify: `rekryteringsplattform/src/app/(dashboard)/company/jobs/[id]/page.tsx`

- [ ] **Step 1: Render the card when status matches**

At the top of the file, add the import:
```ts
import { FeeReconfirmCard } from "@/components/dashboard/company/fee-reconfirm-card";
```

Inside the page JSX, near the existing fee banner (around line 146 — the `Banknote`/`jobDetailsFee` block), insert *above* the `<Tabs>` element:
```tsx
{job.status === "pending_client_reconfirm" && job.client_fee_amount_proposed != null && job.client_fee_amount_estimated != null && (
    <FeeReconfirmCard
        jobId={job.id}
        estimated={Number(job.client_fee_amount_estimated)}
        proposed={Number(job.client_fee_amount_proposed)}
        currency={job.salary_currency || "EUR"}
        reason={job.client_fee_uplift_reason}
        note={job.client_fee_uplift_note}
    />
)}
```

If the page's job-fetch select doesn't already pull all columns (it likely uses `*`), no further change needed. Otherwise widen the select to include `client_fee_amount_proposed`, `client_fee_uplift_reason`, `client_fee_uplift_note`.

- [ ] **Step 2: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -15
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/src/app/(dashboard)/company/jobs/[id]/page.tsx
git commit -m "feat(company): show fee re-confirm card on job detail"
```

---

## Task 16: Dashboard banner

**Files:**
- Create: `rekryteringsplattform/src/components/dashboard/company/reconfirm-banner.tsx`
- Modify: `rekryteringsplattform/src/app/(dashboard)/company/layout.tsx`

- [ ] **Step 1: Write a server-rendered banner that counts pending jobs**

```tsx
// rekryteringsplattform/src/components/dashboard/company/reconfirm-banner.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/server";

export async function ReconfirmBanner() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();
    if (!company) return null;

    const { data: jobs } = await supabase
        .from("jobs")
        .select("id")
        .eq("company_id", company.id)
        .eq("status", "pending_client_reconfirm")
        .limit(20);

    const count = jobs?.length ?? 0;
    if (count === 0) return null;

    const dict = await getDictionary();
    const tmpl = count === 1
        ? (dict as any)?.feeReconfirm?.bannerSingular ?? "{count} job needs your re-confirmation"
        : (dict as any)?.feeReconfirm?.bannerPlural ?? "{count} jobs need your re-confirmation";
    const text = tmpl.replace("{count}", String(count));

    return (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-sm">
            <Link href={`/company/jobs/${jobs![0].id}`} className="font-semibold text-amber-900 hover:underline">
                {text} →
            </Link>
        </div>
    );
}
```

- [ ] **Step 2: Mount it in the company layout**

Open `src/app/(dashboard)/company/layout.tsx`. At the top of the rendered JSX (just inside the outer wrapper, before the existing children/content), add:
```tsx
import { ReconfirmBanner } from "@/components/dashboard/company/reconfirm-banner";
```
and render:
```tsx
<ReconfirmBanner />
```
at the top of the layout body. (If the layout currently has no obvious insertion point, place it immediately above `{children}`.)

- [ ] **Step 3: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -15
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add rekryteringsplattform/src/components/dashboard/company/reconfirm-banner.tsx \
        rekryteringsplattform/src/app/\(dashboard\)/company/layout.tsx
git commit -m "feat(company): dashboard banner for pending re-confirms"
```

---

## Task 17: Declaration disclaimer line

**Files:**
- Modify: `rekryteringsplattform/src/app/(dashboard)/company/jobs/new/create-job-form.tsx`

- [ ] **Step 1: Locate the declaration step's fee display**

In `create-job-form.tsx`, search for the declaration step's fee/calculator block (the area where the user ticks `declarationConfirmed`). Below the displayed estimated fee, render:
```tsx
<p className="text-xs text-slate-500 mt-2 leading-snug">
    {t("feeReconfirm.declarationDisclaimer")}
</p>
```

If `t` is already imported via `useTranslations()`, no extra import is needed. Otherwise add at the top:
```ts
import { useTranslations } from "@/i18n/client";
```
and within the component:
```ts
const { t } = useTranslations();
```
(Skip if already present — TS will flag a duplicate.)

- [ ] **Step 2: Build**

```bash
cd rekryteringsplattform && npm run build 2>&1 | tail -10
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add rekryteringsplattform/src/app/\(dashboard\)/company/jobs/new/create-job-form.tsx
git commit -m "feat(declaration): disclaimer about fee re-confirmation"
```

---

## Task 18: Manual test matrix (UAT)

This task does not change code. Run the full flow against a staging env or a local Supabase. Mark each item before declaring done.

- [ ] **A. Apply migration**

```bash
cd rekryteringsplattform && npx supabase db push --linked 2>&1 | tail -10
```
Expected: `034_client_fee_reconfirm.sql` applied.

- [ ] **B. Submit a fresh job as a company user; record the displayed estimated fee**

- [ ] **C. As admin, open the job; click Approve without changing anything**

Expected: status → `active`, no email to client.

- [ ] **D. Submit another job. As admin, lower `client_fee_amount` by €500; click Approve**

Expected: status → `active`, no email to client. Job detail shows the lower number.

- [ ] **E. Submit another job. As admin, raise `client_fee_amount` by €1 000; click Approve**

Expected: modal opens. Pick reason `hard_to_fill`, leave note blank, submit.

- Status moves to `pending_client_reconfirm`.
- Email arrives at company contact with original/proposed/reason/link.
- Company user lands on dashboard → banner visible.
- Job detail page shows the re-confirm card with original, proposed, +€1 000, reason label.

- [ ] **F. As company, click Approve new fee**

Expected: status → `active`, `client_fee_amount` = proposed, `decision = approved`. Recruiters get the new-job notification.

- [ ] **G. Repeat E → as company, click Reject**

Expected: status → `pending_approval`, proposal cleared, banner disappears, admin sees row back in pending.

- [ ] **H. Repeat E → admin clicks Withdraw to original**

Expected: status → `active`, `client_fee_amount` = estimated, `decision = withdrawn`. No client click required.

- [ ] **I. Repeat E → admin re-edits to a different higher amount mid-flight, clicks Approve, picks reason again**

Expected: `client_fee_amount_proposed` updates, fresh email sent, banner reflects new number.

- [ ] **J. Race test (best-effort)**

Open client and admin tabs side by side. Admin clicks Withdraw and client clicks Approve within ~1 sec. Expected: one succeeds, the other returns `Job is no longer awaiting re-confirmation`. No row in inconsistent state.

- [ ] **K. Custom reason validation**

Trigger E again, pick reason `custom`, leave note empty, submit. Expected: toast error "Please add a note explaining the custom reason." Action does not fire.

- [ ] **L. Final commit + push**

```bash
git push origin fix/client-feedback-batch-2
```

---

## Self-review notes (post-write)

- Spec coverage: every requirement in the spec maps to a task.
- Status guard `WHERE status = 'pending_client_reconfirm'` appears in all four resolve paths to prevent the race documented in spec edge case #3.
- `requestClientFeeReconfirm` accepts both `pending_approval` and `pending_client_reconfirm` so admin can re-arm a proposal without first cancelling, per edge case #1; it also clears stale `decision`/`resolved_at` when re-arming after a rejection cycle.
- Type union `JobStatus` widened (added `pending_approval` + `pending_client_reconfirm`) — this may surface latent type errors in callers that switched on the old union; resolve by widening comparisons, never by narrowing the type.
- Recruiter-side mandate fetches do *not* need the new fields — recruiters never see the re-confirm card. Verified against spec "Out of scope".
- No placeholders. Every code step contains the actual code.
