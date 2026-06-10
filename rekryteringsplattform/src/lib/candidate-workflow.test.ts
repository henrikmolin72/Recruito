import { describe, it, expect } from "vitest";
import {
    canTransitionCandidateStatus,
    CANDIDATE_WITHDRAW_BLOCKED_STATUSES,
    CANDIDATE_WITHDRAW_REASONS,
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
