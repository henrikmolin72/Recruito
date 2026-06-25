import { describe, it, expect } from "vitest";
import {
    canTransitionCandidateStatus,
    CANDIDATE_WITHDRAW_BLOCKED_STATUSES,
    CANDIDATE_WITHDRAW_REASONS,
    isCandidateRejected,
    isCandidateInProcess,
    countRecruiterCandidateBuckets,
    isCandidateSubmitted,
    isCandidateInInterview,
    countCompanyCandidateBuckets,
} from "./candidate-workflow";

// Workflow spec: Withdrawn can be triggered from Draft, In Review, Submitted,
// Interview, Final Interview and Offer — never from Hired or Rejected.
describe("candidate withdrawal rules", () => {
    const ALLOWED_FROM = [
        "draft",
        "submitted",
        "reviewing",
        "under_client_review",
        "info_requested",
        "resubmitted",
        "interview_stage_1",
        "interview_stage_2",
        "interview_stage_3",
        "final_interview",
        "offer_in_progress",
        "offer_accepted",
    ];

    const BLOCKED_FROM = [
        "hired",
        "invoice_enabled",
        "guarantee_tracking",
        "rejected_client",
        "rejected_interview",
        "recruito_rejected",
        "duplicate_rejected",
        "candidate_withdrawn",
        "completed",
    ];

    it("allows withdrawal from draft through offer", () => {
        for (const from of ALLOWED_FROM) {
            expect(canTransitionCandidateStatus(from, "candidate_withdrawn"), from).toBe(true);
            expect(CANDIDATE_WITHDRAW_BLOCKED_STATUSES.has(from), from).toBe(false);
        }
    });

    it("blocks withdrawal once hired or rejected (or already terminal)", () => {
        for (const from of BLOCKED_FROM) {
            expect(CANDIDATE_WITHDRAW_BLOCKED_STATUSES.has(from), from).toBe(true);
        }
        for (const from of ["hired", "rejected_client", "rejected_interview", "recruito_rejected"]) {
            expect(canTransitionCandidateStatus(from, "candidate_withdrawn"), from).toBe(false);
        }
    });

    it("uses the spec withdrawal reasons", () => {
        expect(CANDIDATE_WITHDRAW_REASONS.map((r) => r.label)).toEqual([
            "Candidate no longer interested",
            "Candidate accepted another offer",
            "Candidate unavailable for interviews",
            "Candidate declined the offer",
            "Candidate withdrew after interview",
            "Candidate withdrew during notice period",
            "Candidate requested profile removal",
            "Recruiter unable to continue representation",
            "Duplicate candidate submission",
            "Other",
        ]);
    });
});

// Pins the bucket definitions behind the admin recruiters table's "Active
// candidates" and "Rejected" columns. The error-prone cases are the ones that
// must fall into NEITHER bucket (drafts, hired/completed, candidate withdrawals).
describe("isCandidateRejected", () => {
    it("counts Recruito-side screening rejections", () => {
        expect(isCandidateRejected("recruito_rejected")).toBe(true);
        expect(isCandidateRejected("duplicate_rejected")).toBe(true);
        expect(isCandidateRejected("client_already_engaged")).toBe(true);
    });

    it("counts client-side rejections, including interview-stage", () => {
        expect(isCandidateRejected("rejected_client")).toBe(true);
        expect(isCandidateRejected("rejected_interview")).toBe(true);
    });

    it("normalizes the legacy 'rejected' status into the rejected bucket", () => {
        expect(isCandidateRejected("rejected")).toBe(true);
    });

    it("does NOT count candidate-driven exits or completion", () => {
        expect(isCandidateRejected("offer_declined")).toBe(false);
        expect(isCandidateRejected("candidate_withdrawn")).toBe(false);
        expect(isCandidateRejected("declined")).toBe(false);
        expect(isCandidateRejected("completed")).toBe(false);
    });

    it("does NOT count drafts, in-flight, or hired", () => {
        expect(isCandidateRejected("draft")).toBe(false);
        expect(isCandidateRejected("under_client_review")).toBe(false);
        expect(isCandidateRejected("hired")).toBe(false);
        expect(isCandidateRejected(null)).toBe(false);
        expect(isCandidateRejected(undefined)).toBe(false);
    });
});

describe("isCandidateInProcess (the 'active' definition)", () => {
    it("is active for in-flight statuses", () => {
        expect(isCandidateInProcess("submitted")).toBe(true);
        expect(isCandidateInProcess("under_client_review")).toBe(true);
        expect(isCandidateInProcess("interview_stage_2")).toBe(true);
        expect(isCandidateInProcess("on_hold")).toBe(true);
    });

    it("treats draft as in-process globally (the recruiter-table helper excludes it separately)", () => {
        expect(isCandidateInProcess("draft")).toBe(true);
    });

    it("is NOT active for rejections, hired, or completed", () => {
        expect(isCandidateInProcess("rejected")).toBe(false);
        expect(isCandidateInProcess("recruito_rejected")).toBe(false);
        expect(isCandidateInProcess("hired")).toBe(false);
        expect(isCandidateInProcess("guarantee_period")).toBe(false);
        expect(isCandidateInProcess("completed")).toBe(false);
        expect(isCandidateInProcess("candidate_withdrawn")).toBe(false);
    });
});

describe("countRecruiterCandidateBuckets", () => {
    it("buckets a mixed list into active + rejected, ignoring the rest", () => {
        const statuses = [
            "submitted",            // active
            "under_client_review",  // active
            "interview_stage_2",    // active
            "recruito_rejected",    // rejected
            "rejected_client",      // rejected
            "rejected",             // rejected (legacy → rejected_client)
            "rejected_interview",   // rejected
            "duplicate_rejected",   // rejected
            "draft",                // neither
            "hired",                // neither
            "completed",            // neither
            "candidate_withdrawn",  // neither
            null,                   // neither
        ];
        expect(countRecruiterCandidateBuckets(statuses)).toEqual({ active: 3, rejected: 5 });
    });

    it("returns zeros for an empty list", () => {
        expect(countRecruiterCandidateBuckets([])).toEqual({ active: 0, rejected: 0 });
    });
});

// Pins the buckets behind the admin companies table's "Candidates Submitted",
// "In interview" and "Rejected" columns. Unlike the recruiter buckets these are
// NOT mutually exclusive — Submitted is a superset.
describe("isCandidateInInterview", () => {
    it("counts every interview stage, including legacy 'interview'", () => {
        expect(isCandidateInInterview("interview_stage_1")).toBe(true);
        expect(isCandidateInInterview("interview_stage_2")).toBe(true);
        expect(isCandidateInInterview("interview_stage_3")).toBe(true);
        expect(isCandidateInInterview("final_interview")).toBe(true);
        expect(isCandidateInInterview("interview")).toBe(true); // legacy → interview_stage_1
    });

    it("does NOT count pre/post-interview statuses", () => {
        expect(isCandidateInInterview("submitted")).toBe(false);
        expect(isCandidateInInterview("under_client_review")).toBe(false);
        expect(isCandidateInInterview("rejected_client")).toBe(false);
        expect(isCandidateInInterview("hired")).toBe(false);
        expect(isCandidateInInterview("draft")).toBe(false);
        expect(isCandidateInInterview(null)).toBe(false);
    });
});

describe("isCandidateSubmitted (all non-draft)", () => {
    it("counts everything that left draft, including interview/rejected/hired", () => {
        expect(isCandidateSubmitted("submitted")).toBe(true);
        expect(isCandidateSubmitted("under_client_review")).toBe(true);
        expect(isCandidateSubmitted("interview_stage_2")).toBe(true);
        expect(isCandidateSubmitted("rejected_client")).toBe(true);
        expect(isCandidateSubmitted("hired")).toBe(true);
        expect(isCandidateSubmitted("completed")).toBe(true);
    });

    it("does NOT count drafts or empty", () => {
        expect(isCandidateSubmitted("draft")).toBe(false);
        expect(isCandidateSubmitted(null)).toBe(false);
        expect(isCandidateSubmitted(undefined)).toBe(false);
    });
});

describe("countCompanyCandidateBuckets", () => {
    it("buckets a mixed list; Submitted is a superset of In interview + Rejected", () => {
        const statuses = [
            "draft",              // none
            "submitted",          // submitted
            "under_client_review", // submitted
            "interview_stage_2",  // submitted + in interview
            "final_interview",    // submitted + in interview
            "interview",          // submitted + in interview (legacy)
            "rejected_client",    // submitted + rejected
            "recruito_rejected",  // submitted + rejected
            "rejected_interview", // submitted + rejected
            "hired",              // submitted
            "completed",          // submitted
            null,                 // none
        ];
        expect(countCompanyCandidateBuckets(statuses)).toEqual({
            submitted: 10,
            inInterview: 3,
            rejected: 3,
        });
    });

    it("returns zeros for an empty list", () => {
        expect(countCompanyCandidateBuckets([])).toEqual({ submitted: 0, inInterview: 0, rejected: 0 });
    });
});
