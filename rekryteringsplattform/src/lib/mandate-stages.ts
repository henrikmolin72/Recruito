// Shared mandate candidate-stage definitions, used by both the recruiter
// mandates list (clickable count badges) and the mandate detail page (stage
// filter) so the two stay in sync.

import { candidateOccupiesCapSlot, normalizeCandidateStatusForWorkflow } from "./candidate-workflow";

export type MandateStage =
    | "draft"
    | "in_review"
    | "submitted"
    | "interview"
    | "final_interview"
    | "offer"
    | "hired"
    | "rejected"
    | "withdrawn";

export const MANDATE_STAGE_KEYS: MandateStage[] = [
    "draft",
    "in_review",
    "submitted",
    "interview",
    "final_interview",
    "offer",
    "hired",
    "rejected",
    "withdrawn",
];

// Days after a mandate is claimed before it is considered expired (no candidate
// screened to the client). Single source of truth shared by the recruiter
// mandates view and the expiry cron, so the UI and the notification never drift.
export const MANDATE_EXPIRY_DAYS = 10;

// "In Review" = still in Recruito's internal review, not yet screened/submitted
// to the client. recruito_screened_at is the divider (empty => internal review).
const IN_REVIEW_STATUSES = new Set(["submitted", "reviewing"]);
const SUBMITTED_STATUSES = new Set([
    "under_client_review", "info_requested", "resubmitted",
    "submitted_to_client", "client_already_engaged", "duplicate_rejected",
]);
const INTERVIEW_STATUSES = new Set([
    "interview", "interview_stage_1", "interview_stage_2",
    "interview_stage_3",
]);
const FINAL_INTERVIEW_STATUSES = new Set(["final_interview"]);
const OFFER_STATUSES = new Set([
    "offer_in_progress", "offer_accepted", "offer_declined",
]);
const HIRED_STATUSES = new Set([
    "hired", "invoice_enabled", "guarantee_tracking", "completed",
    "guarantee_active", "payout_released", "guarantee_period",
]);
const REJECTED_STATUSES = new Set([
    "rejected", "declined", "rejected_client", "rejected_interview",
    "guarantee_failed", "recruiter_rejected",
    "recruito_rejected",
]);
// Withdrawn is its own tab per the workflow spec — not a kind of rejection.
const WITHDRAWN_STATUSES = new Set(["candidate_withdrawn"]);

// Statuses that make a candidate "inactive" for the mandate-expiry timer.
// Per product rule (updated 2026-07-06): a candidate in a live active stage
// (in review → offer, or hired) suspends the expiry; the 10-day timer (re)starts
// once EVERY candidate is inactive. Both hard rejections AND withdrawals count as
// inactive — a withdrawn candidate no longer keeps the clock suspended.
// (A duplicate lives under the "submitted" stage, so it is NOT inactive.)
const EXPIRY_INACTIVE_STATUSES = new Set([
    "rejected_client", "rejected_interview", "recruito_rejected", "declined", "rejected",
    ...WITHDRAWN_STATUSES,
]);

export interface ExpiryCandidate {
    status: string | null;
    status_changed_at?: string | null;
}

// Days left on the mandate's no-delivery expiry, or null when no expiry applies
// (at least one live candidate exists). Single source of truth shared by the
// recruiter mandates view and the expiry cron.
//   - 0 candidates              → 10 days from claim.
//   - any live candidate         → no expiry (null).
//   - all candidates inactive    → 10 days from the most recent rejection/withdrawal.
export function mandateExpiryDaysLeft(opts: {
    claimedAt: string | null;
    candidates: ExpiryCandidate[];
    now?: number;
}): number | null {
    const { claimedAt } = opts;
    // Drafts are not real submissions — they never suspend the expiry timer.
    const candidates = opts.candidates.filter((c) => (c.status ?? "") !== "draft");
    const now = opts.now ?? Date.now();
    if (!claimedAt) return null;

    const hasLive = candidates.some((c) => !EXPIRY_INACTIVE_STATUSES.has(c.status ?? ""));
    if (hasLive) return null;

    let baseMs: number;
    if (candidates.length === 0) {
        baseMs = new Date(claimedAt).getTime();
    } else {
        // All candidates inactive → restart from the last rejection/withdrawal date.
        const lastRejectionMs = candidates.reduce((max, c) => {
            const t = c.status_changed_at ? new Date(c.status_changed_at).getTime() : 0;
            return t > max ? t : max;
        }, 0);
        baseMs = lastRejectionMs || new Date(claimedAt).getTime();
    }

    const expiryMs = baseMs + MANDATE_EXPIRY_DAYS * 86_400_000;
    return Math.ceil((expiryMs - now) / 86_400_000);
}

// Whether a single mandate row is currently a LIVE active mandate: the recruiter
// still holds it (is_active) AND the no-delivery timer has not run out. Single
// source of truth shared by the company Jobs list count and the job-detail
// Recruiters tab so the two "active recruiter" numbers can never drift.
export function isMandateLiveActive(
    mandate: { isActive: boolean | null | undefined; claimedAt: string | null },
    candidates: ExpiryCandidate[],
    now?: number,
): boolean {
    const daysLeft = mandateExpiryDaysLeft({ claimedAt: mandate.claimedAt ?? null, candidates, now });
    return !!mandate.isActive && (daysLeft === null || daysLeft > 0);
}

export interface RecruiterMandate {
    recruiterId: string | null | undefined;
    isActive: boolean | null | undefined;
    claimedAt: string | null;
}

// Distinct recruiters with at least one live active mandate on a job. Collapses
// multiple mandate rows per recruiter (mandate recycling, migration 045): a
// recruiter is Active if ANY of their rows is live. `candidatesByRecruiter` keys
// candidate timing rows by recruiter id for the shared 10-day expiry calc.
export function countActiveRecruiters(
    mandates: RecruiterMandate[],
    candidatesByRecruiter: Map<string, ExpiryCandidate[]>,
    now?: number,
): number {
    const activeByRecruiter = new Map<string, boolean>();
    for (const m of mandates) {
        const rid = m.recruiterId;
        if (!rid) continue;
        const live = isMandateLiveActive(m, candidatesByRecruiter.get(rid) || [], now);
        activeByRecruiter.set(rid, (activeByRecruiter.get(rid) || false) || live);
    }
    let count = 0;
    for (const active of activeByRecruiter.values()) if (active) count++;
    return count;
}

export interface MandateRow<R> {
    recruiter: R | null | undefined;
    is_active: boolean | null | undefined;
    claimed_at: string | null | undefined;
}

export interface RecruiterCandidateTiming extends ExpiryCandidate {
    recruiter_id: string | null;
}

/**
 * One row per recruiter for a job's Recruiters tab. A recruiter can hold several
 * mandate rows on one job (mandate recycling, migration 045): an expired cycle
 * stays as is_active=false history alongside a fresh re-claim. Collapse to one
 * row — Active if ANY of their rows is live under the shared 10-day timer — so
 * the company view and the admin view show the status the recruiter sees.
 */
export function collapseMandateRows<R extends { id: string }>(
    mandates: MandateRow<R>[],
    candidates: RecruiterCandidateTiming[],
    now?: number,
): { recruiter: R; active: boolean }[] {
    const candsByRecruiter = new Map<string, ExpiryCandidate[]>();
    for (const c of candidates) {
        if (!c.recruiter_id) continue;
        const arr = candsByRecruiter.get(c.recruiter_id) || [];
        arr.push({ status: c.status, status_changed_at: c.status_changed_at });
        candsByRecruiter.set(c.recruiter_id, arr);
    }
    const rows = new Map<string, { recruiter: R; active: boolean }>();
    for (const m of mandates) {
        const recruiter = m.recruiter;
        if (!recruiter?.id) continue;
        const live = isMandateLiveActive(
            { isActive: m.is_active, claimedAt: m.claimed_at ?? null },
            candsByRecruiter.get(recruiter.id) || [],
            now,
        );
        const existing = rows.get(recruiter.id);
        if (existing) existing.active = existing.active || live;
        else rows.set(recruiter.id, { recruiter, active: live });
    }
    return [...rows.values()];
}

export interface StageCandidate {
    status: string | null;
    recruito_screened_at?: string | null;
}

// Whether a candidate belongs to a given stage. "in_review" additionally
// requires that the candidate has NOT been screened to the client yet.
export function candidateInStage(c: StageCandidate, stage: MandateStage): boolean {
    const s = c.status ?? "";
    switch (stage) {
        case "draft":
            return s === "draft";
        case "in_review":
            return IN_REVIEW_STATUSES.has(s) && !c.recruito_screened_at;
        case "submitted":
            // A candidate still at a raw submitted/reviewing status but already
            // screened to the client belongs in "submitted", not nowhere — the
            // screen step sets recruito_screened_at without advancing status.
            return SUBMITTED_STATUSES.has(s) || (IN_REVIEW_STATUSES.has(s) && !!c.recruito_screened_at);
        case "interview":
            return INTERVIEW_STATUSES.has(s);
        case "final_interview":
            return FINAL_INTERVIEW_STATUSES.has(s);
        case "offer":
            return OFFER_STATUSES.has(s);
        case "hired":
            return HIRED_STATUSES.has(s);
        case "rejected":
            return REJECTED_STATUSES.has(s);
        case "withdrawn":
            return WITHDRAWN_STATUSES.has(s);
        default:
            return false;
    }
}

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

// Client-rejection reasons for a job, grouped for the "Ongoing process" card
// (client request 2026-07-11): recruiters see WHY the client rejects so they
// can align their search. Reasons are structured labels (no PII), so they are
// safe to show across all recruiters on the job.
export function groupStageReasons(rows: { reason: string | null }[]): { reason: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const row of rows) {
        const reason = row.reason?.trim();
        if (!reason) continue;
        counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
    return [...counts.entries()]
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

// Whether a company-visible candidate counts as "Active" in the company Jobs
// list "Active Candidates" column: still in an active stage (In Review →
// Submitted → Interview → Final Interview → Offer → Hired). Mirrors
// candidateOccupiesCapSlot (drops draft + rejected/withdrawn/declined) but also
// drops on_hold: paused/rejected/withdrawn are the pipeline's three inactive
// columns, and only the first six stages are "active" per product spec.
export function isActiveCompanyCandidate(status: string | null | undefined): boolean {
    if (!candidateOccupiesCapSlot(status)) return false;
    return normalizeCandidateStatusForWorkflow(status ?? "") !== "on_hold";
}

// Candidates that reached the interview milestone: currently at interview /
// final_interview, or already past it (offer / hired). Unlike the current-stage
// "In interview" count, a candidate now at offer or hired still counts — they
// did move to interview. Powers the recruiter dashboard "Interview rate" box.
// ponytail: a candidate rejected AT interview is stored as a generic rejected
// status upstream, indistinguishable from a pre-interview rejection, so it is
// not counted here — the same limitation the rest of the app lives with.
export function candidateReachedInterview(c: StageCandidate): boolean {
    return (
        candidateInStage(c, "interview") ||
        candidateInStage(c, "final_interview") ||
        candidateInStage(c, "offer") ||
        candidateInStage(c, "hired")
    );
}

export function isMandateStage(value: string | null | undefined): value is MandateStage {
    return !!value && (MANDATE_STAGE_KEYS as string[]).includes(value);
}

// Which tab a mandate is grouped under in the recruiter "My Mandates" view.
export type MandateTabKey = "active" | "closed" | "hired";

// Job statuses that mean the client closed the mandate (vs. it expiring because
// the recruiter delivered nothing). Paused (auto-pause on cap) stays Active.
export const CLIENT_CLOSED_JOB_STATUSES = new Set(["closed", "filled", "cancelled"]);

// Job statuses that no longer accept NEW candidate referrals: the client-ended
// statuses PLUS "paused". A paused job (manual pause, or auto-pause when the
// candidate cap is hit) must reject new presentations even from a recruiter who
// still holds an active mandate row. Deliberately DISTINCT from
// CLIENT_CLOSED_JOB_STATUSES — that set also buckets a mandate into the "Closed"
// tab, whereas a paused mandate must stay in the recruiter's Active tab
// (classifyMandate). Single source of truth shared by the Refer button, the
// new-candidate page guard, and the createCandidateExtended server boundary so a
// paused job can never receive a referral on any path.
export const REFERRAL_BLOCKED_JOB_STATUSES = new Set<string>([
    ...CLIENT_CLOSED_JOB_STATUSES,
    "paused",
]);

export interface ClassifiableMandate {
    status: string | null;
    // Target headcount (jobs.open_positions). Absent/≤0 is treated as 1.
    open_positions?: number | null;
    candidates: StageCandidate[];
}

// A job's positions are all filled once its hired count reaches the target
// headcount (jobs.open_positions, default 1). Single source of truth shared by
// the recruiter Mandates tab classifier and the auto-fill-on-hire engine, so
// "stays Active until every position is filled" means the same thing in both.
export function openPositionsFilled(hiredCount: number, openPositions: number | null | undefined): boolean {
    const target = openPositions && openPositions > 0 ? openPositions : 1;
    return hiredCount >= target;
}

// Buckets a mandate into the recruiter's My-Mandates tabs. There is deliberately
// no "expired" bucket: the daily expiry cron releases timer-expired mandates
// (is_active=false) and they drop out of the recruiter's mandate query entirely,
// resurfacing under Browse Jobs with the "Worked Previously" tag. In the brief
// window before the cron runs, a timer-expired mandate classifies as "active";
// the per-row expiry check still disables Refer and shows the "Expired" label.
export function classifyMandate(m: ClassifiableMandate): MandateTabKey {
    // Only leave the Active tab for "Hired" once every open position is filled.
    // A multi-position job with one hire still needs more candidates, so it stays
    // Active (client request 2026-08-21). An explicit client close still wins.
    const hiredCount = (m.candidates || []).filter((c) => candidateInStage(c, "hired")).length;
    if (openPositionsFilled(hiredCount, m.open_positions)) return "hired";
    if (m.status && CLIENT_CLOSED_JOB_STATUSES.has(m.status)) return "closed";
    return "active";
}
