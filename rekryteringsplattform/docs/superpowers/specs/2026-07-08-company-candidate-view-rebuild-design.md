# Company Candidate View Rebuild — Design

**Date:** 2026-07-08
**Status:** Approved (design), pending implementation plan
**Owner:** Henrik

## Problem

The company `/company/candidates` page renders a 9-column Kanban board. The client
raised two issues (see client screenshots):

1. **Remove the "Presented" and "Paused" columns.** Candidates should land in
   "Under Review" and never appear under a "Paused" status *from the company's
   point of view*.
2. **Rebuild the layout from the company's perspective.** With hundreds of
   candidates the Kanban forces excessive horizontal/vertical scrolling; a
   structured, filter-tab list scales better. The client's own mockup (image 2)
   shows a horizontal count-tab bar (All / Under Review / Interview / Offer /
   Hired / Rejected / Withdrawn) above a candidate list, with a Filters affordance.

## Decisions (locked)

- **Scope:** Build both changes now (Phase 1 column removal + Phase 2 layout rebuild).
- **Paused = display-only fold.** The company board stops showing a Paused column;
  `on_hold` candidates are displayed under "Under Review". The `on_hold` workflow
  status, transitions, auto-pause, and recruiter/admin views are left exactly as-is.
  Zero workflow-engine risk.
- **Final Interview folded into the Interview tab** (matches the client mockup — no
  separate Final tab).
- **Filters = name search + job-title dropdown** (client-side; data already loaded).

## Blast radius

- **Primary:** `src/components/dashboard/company/candidate-pipeline.tsx` (191 lines,
  company-only). Only `/company/candidates/page.tsx` imports it; recruiter and admin
  have separate views. Isolated by construction.
- **i18n:** new tab/UI label keys added to all four dictionaries
  (`en`, `sv`, `no`, `da`) per the project i18n guardrail (build fails otherwise).
- **Nothing else changes:** no `candidate-workflow.ts`, no `TRANSITIONS`, no DB
  migration, no server actions, no recruiter/admin code, no count helpers
  (`isActiveCompanyCandidate` etc. feed the Jobs-list column — a separate concern).

### Why "Presented" removal is safe
`getColumnKey()` never returns `"submitted"` (a raw `submitted` status is mapped to
the `reviewing` bucket), and the page's visibility gate only shows candidates after
`recruito_screened_at` is set. So the "Presented" column (`key: "submitted"`) is
**always empty today**. Removing it deletes a dead array entry.

### Why "Paused" fold is safe
The company never sets a candidate to `on_hold` — the company "Pause" button pauses
the *job* (`pauseJob`), unrelated to candidate status. `on_hold` is set only by the
recruiter/admin stage panel. Folding it into the company's "Under Review" display
bucket is a pure display change; recruiters/admins still see and set `on_hold`.

## Stage taxonomy (display buckets)

Collapse today's 9 columns → 7 tabs. Implemented as a ~4-line retarget of the
existing `getColumnKey()` (renamed conceptually to a stage-bucket function):

| Tab            | Bucket contents                                                             |
|----------------|-----------------------------------------------------------------------------|
| **All**        | everyone                                                                     |
| **Under Review** | `submitted`, `under_client_review`, `info_requested`, `resubmitted`, **`on_hold`** |
| **Interview**  | `interview_stage_1/2/3`, **`final_interview`**                               |
| **Offer**      | `offer_in_progress`, `offer_accepted`                                        |
| **Hired**      | `hired`, `invoice_enabled`, `guarantee_tracking`                             |
| **Rejected**   | `duplicate_rejected`, `client_already_engaged`, `rejected_client`, `rejected_interview`, `offer_declined` |
| **Withdrawn**  | `candidate_withdrawn`                                                        |

Changes vs current `getColumnKey()`:
- `on_hold`: `"paused"` → `"under_review"` (fold)
- `final_interview`: `"final_interview"` → `"interview"` (fold)
- The `"submitted"`, `"paused"`, `"final_interview"` standalone buckets are removed.

Bucket keys align with existing i18n `pipeline*` label keys where possible
(`pipelineUnderReview`, `pipelineInterview`, `pipelineOffer`, `pipelineHired`,
`pipelineRejected`, `pipelineWithdrawn`).

## Layout

Replaces the Kanban entirely — the tab-list *is* the view.

- **Tab bar (top):** horizontal, count-pill tabs (All + the 6 stage buckets),
  active tab highlighted. Clicking filters the list. Horizontally scrollable on
  narrow viewports.
- **Filters (right):** name search input + job-title dropdown. Both client-side,
  applied on top of the active tab. Data is already fully loaded on the page.
- **List (below):** reuse the existing `ListView` card rows unchanged (avatar,
  name, `StatusBadge`, job title, presented date, viewed eye, Show Profile link),
  fed the filtered list.
- **Deleted:** `PipelineView` (Kanban) and the pipeline/list view toggle. Net line
  count flat or negative.

## Components / data flow

```
CompanyCandidatesPage (server)
  → getCompanyCandidates()  [unchanged: recruito_screened_at gate]
  → <CandidatePipeline candidates noticeAccepted />   (renamed role: tab-list container)
        state: activeTab, search, jobFilter
        derive: stageBucket(status) per candidate; counts per tab
        render: <TabBar/> + <FilterControls/> + filtered <ListView/>
```

No new data fetching; all filtering is client-side over the already-loaded array.

## Deliberately NOT touched

`candidate-workflow.ts`, `TRANSITIONS`, `on_hold` as a real status, recruiter/admin
stage panels, auto-pause (pauses jobs), Jobs-list count helpers.

## Verification

1. `npm run build` **and** `npm run lint` in `rekryteringsplattform/` (project gate —
   build does not run ESLint, lint separately).
2. Unit test pinning the bucket map: `on_hold → under_review`,
   `final_interview → interview`, and no `presented`/`paused` buckets exist.
3. Browser check via preview: tabs filter correctly, per-tab counts match the data,
   name search and job dropdown narrow the list, empty states render.

## Out of scope / later

- Server-side pagination or virtualization (only needed well beyond "hundreds";
  client-side filtering over the loaded array is sufficient now).
- Any change to how candidates are *set* to `on_hold` or `submitted`.
- Recruiter/admin candidate views.
