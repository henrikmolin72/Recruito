# Interview Rounds v1 Design (Candidate-level Scheduling Workflow)

Date: 2026-02-22
Scope: Next.js + Supabase recruitment platform (`Recruito`)

## Summary

This design adds structured interview round scheduling for each candidate so both recruiter and company can request, propose, confirm, reschedule, cancel, and complete interviews inside the app. The current platform supports pipeline stages and a coarse candidate status (`interview`), but it does not model interview rounds as first-class records with timeline/history. As a result, multiple interviews are possible in theory (via pipeline stages) but not operationally trackable.

v1 will introduce a dedicated interview rounds module that is intentionally separate from candidate pipeline progression. Pipeline/stage updates will continue to be managed manually by the company as they are today. This reduces risk and allows a clean rollout without breaking current candidate flow.

## Validated v1 Decisions

The following product decisions were validated:

- Full interview workflow in app (not just history logging)
- Both parties can initiate and act (recruiter and company)
- No calendar integration in v1
- One active time proposal at a time
- One active interview round at a time per candidate
- Interview rounds are separate from pipeline automation in v1

Implication: v1 prioritizes reliable workflow state and visibility over advanced scheduling (availability lookup, calendar sync, multi-slot proposals).

## Goals and Non-Goals

### Goals

- Support repeated interviews for the same candidate with clear round history
- Give both parties symmetric actions (request, propose, confirm, reschedule, cancel)
- Show current interview status clearly on both company and recruiter candidate detail pages
- Generate notifications for important transitions
- Preserve audit trail of what happened and who acted

### Non-Goals (v1)

- Google/Outlook calendar sync
- Multiple parallel active interview rounds
- Multiple simultaneous time slots in one proposal
- Automatic candidate pipeline/status transitions based on interview events
- Candidate-facing scheduling UI

## Data Model

### 1) `candidate_interviews` (snapshot/current state)

One row per interview round for a candidate.

Recommended columns:

- `id uuid pk`
- `candidate_id uuid not null references candidates(id) on delete cascade`
- `job_id uuid not null references jobs(id) on delete cascade` (denormalized for easier authorization/revalidation)
- `round_number int not null` (1, 2, 3...)
- `pipeline_stage_id text null` (optional context only; no FK because job stages are JSONB)
- `status interview_round_status not null`
- `requested_by_user_id uuid not null references profiles(id)`
- `requested_by_role user_role not null` (`company` or `recruiter`)
- `last_actor_user_id uuid null references profiles(id)` (for UI "last updated by")
- `last_actor_role user_role null`
- `proposed_start_at timestamptz null`
- `proposed_end_at timestamptz null`
- `timezone text null` (default `Europe/Stockholm`)
- `meeting_mode text null` (`video`, `phone`, `onsite`)
- `meeting_link text null`
- `location text null`
- `confirmed_at timestamptz null`
- `completed_at timestamptz null`
- `cancelled_at timestamptz null`
- `cancel_reason text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended enum:

- `interview_round_status = ('requested', 'proposed', 'confirmed', 'completed', 'cancelled')`

### 2) `candidate_interview_events` (append-only history)

Tracks every action for audit trail and timeline UI.

Recommended columns:

- `id uuid pk`
- `interview_id uuid not null references candidate_interviews(id) on delete cascade`
- `candidate_id uuid not null references candidates(id) on delete cascade`
- `event_type interview_round_event_type not null`
- `actor_user_id uuid not null references profiles(id)`
- `actor_role user_role not null`
- `payload jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Typical event types:

- `requested`
- `time_proposed`
- `time_counter_proposed`
- `confirmed`
- `rescheduled` (optional alias for counter proposal)
- `cancelled`
- `completed`
- `note_added` (optional, can defer)

### Constraints and Indexes

Key constraints:

- Partial unique index to enforce one active round per candidate:
  - statuses `requested`, `proposed`, `confirmed`
- Unique `(candidate_id, round_number)`
- Check `proposed_end_at > proposed_start_at` when both are non-null
- Check `meeting_link` required for `video` and `location` required for `onsite` (can be app-level validation in v1 if DB checks feel too rigid)

Indexes:

- `idx_candidate_interviews_candidate`
- `idx_candidate_interviews_status`
- `idx_candidate_interviews_job`
- `idx_candidate_interview_events_interview_created_at`
- `idx_candidate_interview_events_candidate_created_at`

## RLS and Authorization

Interview rows must be readable/writable by:

- Company user who owns the candidate's job
- Recruiter user who owns the candidate presentation
- Admin

Recommended pattern:

- Write policies using joins to `candidates -> jobs -> companies` and `candidates -> recruiters`
- Avoid recursive policy patterns (recent issue with `conversation_participants` recursion shows this is a real risk)
- Keep policies straightforward and one-directional

Authorization should be duplicated in server actions (defense in depth), not delegated to RLS alone.

## Status Machine (v1)

Allowed transitions:

- `requested -> proposed`
- `proposed -> confirmed`
- `proposed -> proposed` (counter proposal / reschedule)
- `confirmed -> proposed` (reschedule after confirmation)
- `requested -> cancelled`
- `proposed -> cancelled`
- `confirmed -> cancelled`
- `confirmed -> completed`

Not allowed:

- `requested -> completed`
- `completed -> *`
- `cancelled -> *`
- `confirm` without active proposal times

Business rule:

- One active round at a time means no `requestInterview` if another round is in `requested|proposed|confirmed`.

## Server Actions and Data Flow

Create a new module: `src/lib/actions/interviews.ts`

Recommended actions:

- `getCandidateInterviews(candidateId)`
- `requestInterview(candidateId, jobId, pipelineStageId?)`
- `proposeInterviewTime(interviewId, startAt, endAt, timezone, meetingMode, meetingLink?, location?, note?)`
- `confirmInterviewTime(interviewId)`
- `counterProposeInterviewTime(...)` (or alias to `proposeInterviewTime`)
- `cancelInterview(interviewId, reason)`
- `completeInterview(interviewId, summary?)`

Action pattern (all mutations):

1. Validate auth user
2. Fetch candidate/interview + verify company/recruiter ownership
3. Validate transition from current status
4. Update snapshot row (`candidate_interviews`)
5. Insert event row (`candidate_interview_events`)
6. Create notification to counterpart (best effort)
7. Revalidate company + recruiter candidate detail paths

Important implementation detail:

- Prevent race conditions with conditional updates (`WHERE id = ? AND status IN (...)`) and check row count.
- If update affects 0 rows, return a user-safe conflict error (state changed).

## UI/UX Design (v1)

### Placement

Add an `Interview Rounds` section on both candidate detail pages:

- Company candidate detail: `/company/jobs/[id]/candidates/[candidateId]`
- Recruiter candidate detail: `/recruiter/mandates/[id]/candidates/[candidateId]`

Recommended placement:

- Near chat (above or below) because scheduling and discussion are tightly coupled

### UI Structure

1. **Active Interview Card** (if active round exists)
   - Title: `Interview 2`
   - Status badge (`Requested`, `Proposed`, `Confirmed`, etc.)
   - Current proposal time window + timezone
   - Meeting mode + link/location
   - "Waiting on" hint (who needs to act)
   - Contextual actions (confirm, propose new time, cancel, complete)

2. **Start New Interview button**
   - Visible only if no active round exists
   - Opens modal/sheet for `requestInterview`

3. **Interview Timeline (history)**
   - Completed and cancelled rounds
   - Expandable event history per round
   - Who did what and when

### Interaction Rules

- `requested`: both can propose a time or cancel
- `proposed`: recipient can confirm or counter-propose; sender can modify/cancel
- `confirmed`: both can reschedule (back to `proposed`), cancel, or mark complete
- `completed/cancelled`: read-only

## Notifications and Chat Integration

For each mutation, create a notification to the counterpart user:

- Interview requested
- Time proposed / counter-proposed
- Time confirmed
- Interview cancelled
- Interview completed

Optional but recommended in v1.1:

- Add system messages to existing candidate chat (best effort only) to keep communication context unified

Notifications should not block the primary interview update. Failures should be logged and surfaced only to monitoring, not end-user flow.

## Error Handling and Edge Cases

Must handle:

- Double submit / repeated clicks
- Race conditions between both parties acting at once
- Invalid time window (`end <= start`)
- Missing meeting link for video or location for onsite
- Creating a new round when an active round already exists
- Confirming without a proposal
- Completing a non-confirmed round

Return structured errors from actions (e.g. `{ error, code }`) to support UI-specific messaging:

- `CONFLICT_ACTIVE_ROUND_EXISTS`
- `INVALID_TRANSITION`
- `UNAUTHORIZED`
- `INVALID_TIME_WINDOW`
- `MISSING_REQUIRED_FIELD`
- `STALE_STATE`

## Testing Plan

### Unit / logic tests

- Transition matrix validation
- Round number generation
- Waiting-on computation for UI state

### Integration tests (server actions)

- Company/recruiter authorization on each action
- Conditional status updates prevent invalid transitions
- Event rows are created for every successful mutation
- Notifications are created for counterpart (or handled as best effort)

### E2E tests (Playwright)

- Request -> propose -> confirm -> complete
- Request -> propose -> counter-propose -> confirm
- Request -> cancel
- Attempt to create new round while active round exists
- Both roles see synchronized state on refresh

## Rollout Plan

1. Add DB migration (tables, enums, indexes, RLS, triggers for `updated_at`)
2. Add `src/lib/actions/interviews.ts` with read/write actions
3. Add shared UI components:
   - `InterviewRoundsPanel`
   - `ActiveInterviewCard`
   - `InterviewTimeline`
   - `InterviewProposalForm`
4. Integrate on company candidate detail page
5. Integrate on recruiter candidate detail page
6. Add notifications
7. Add tests (action + E2E critical paths)
8. Optional v1.1: system messages in chat

## Open Items (Deferred)

- Calendar sync (Google/Microsoft)
- Multiple proposal slots
- Multiple concurrent interview rounds
- Pipeline automation based on interview outcomes
- Candidate self-scheduling / availability collection

## Recommendation

Proceed with this design as v1. It solves the core business need (multiple interviews per candidate with real scheduling workflow and history) while staying compatible with the current pipeline architecture and avoiding high-risk calendar integration scope.
