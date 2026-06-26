import { describe, it, expect } from "vitest";
import {
    allowedNextStages,
    canTransition,
    canReopenTo,
    REOPEN_TARGETS,
    COMPANY_STAGES,
    COMPANY_STAGE_TO_STATUS,
} from "./candidate-stage-rules";

describe("allowedNextStages", () => {
    it("only allows viewed from a never-viewed (null) candidate", () => {
        expect(allowedNextStages(null)).toEqual(["viewed"]);
    });

    it("returns the single forward step plus reject for each active rung", () => {
        expect(allowedNextStages("viewed")).toEqual(["interview", "rejected"]);
        expect(allowedNextStages("interview")).toEqual(["final_interview", "rejected"]);
        expect(allowedNextStages("final_interview")).toEqual(["job_offer", "rejected"]);
        expect(allowedNextStages("job_offer")).toEqual(["hired", "rejected"]);
    });

    it("treats hired, rejected and withdrawn as terminal (no next stage)", () => {
        expect(allowedNextStages("hired")).toEqual([]);
        expect(allowedNextStages("rejected")).toEqual([]);
        expect(allowedNextStages("withdrawn")).toEqual([]);
    });
});

describe("canTransition", () => {
    it("allows null -> viewed only", () => {
        expect(canTransition(null, "viewed")).toBe(true);
        expect(canTransition(null, "interview")).toBe(false);
        expect(canTransition(null, "rejected")).toBe(false);
    });

    it("allows each forward single step", () => {
        expect(canTransition("viewed", "interview")).toBe(true);
        expect(canTransition("interview", "final_interview")).toBe(true);
        expect(canTransition("final_interview", "job_offer")).toBe(true);
        expect(canTransition("job_offer", "hired")).toBe(true);
    });

    it("blocks skipping a stage", () => {
        expect(canTransition("viewed", "final_interview")).toBe(false);
        expect(canTransition("viewed", "job_offer")).toBe(false);
        expect(canTransition("interview", "job_offer")).toBe(false);
        expect(canTransition("interview", "hired")).toBe(false);
    });

    it("blocks moving backward", () => {
        expect(canTransition("interview", "viewed")).toBe(false);
        expect(canTransition("final_interview", "interview")).toBe(false);
        expect(canTransition("job_offer", "interview")).toBe(false);
        expect(canTransition("job_offer", "viewed")).toBe(false);
    });

    it("allows reject from every active stage", () => {
        expect(canTransition("viewed", "rejected")).toBe(true);
        expect(canTransition("interview", "rejected")).toBe(true);
        expect(canTransition("final_interview", "rejected")).toBe(true);
        expect(canTransition("job_offer", "rejected")).toBe(true);
    });

    it("treats hired and rejected as terminal", () => {
        expect(canTransition("hired", "interview")).toBe(false);
        expect(canTransition("hired", "rejected")).toBe(false);
        expect(canTransition("rejected", "interview")).toBe(false);
        expect(canTransition("rejected", "hired")).toBe(false);
    });

    it("treats moving to the same stage as a no-op (allowed)", () => {
        expect(canTransition("viewed", "viewed")).toBe(true);
        expect(canTransition("rejected", "rejected")).toBe(true);
        expect(canTransition(null, null as unknown as string)).toBe(true);
    });
});

describe("canReopenTo", () => {
    it("accepts the reopen targets", () => {
        for (const target of REOPEN_TARGETS) {
            expect(canReopenTo(target)).toBe(true);
        }
        expect(canReopenTo("interview")).toBe(true);
        expect(canReopenTo("final_interview")).toBe(true);
        expect(canReopenTo("job_offer")).toBe(true);
    });

    it("rejects viewed, hired and rejected as reopen targets", () => {
        expect(canReopenTo("viewed")).toBe(false);
        expect(canReopenTo("hired")).toBe(false);
        expect(canReopenTo("rejected")).toBe(false);
    });
});

describe("COMPANY_STAGE_TO_STATUS", () => {
    // Regression: a company "interview"/"final_interview" move used to leave
    // candidates.status untouched, so the recruiter kept seeing "Under review"
    // while the company saw "Interview".
    it("maps interview and final_interview to interview statuses", () => {
        expect(COMPANY_STAGE_TO_STATUS.interview).toBe("interview");
        expect(COMPANY_STAGE_TO_STATUS.final_interview).toBe("final_interview");
    });

    it("keeps the existing offer/hire/reject mappings", () => {
        expect(COMPANY_STAGE_TO_STATUS.job_offer).toBe("offer_in_progress");
        expect(COMPANY_STAGE_TO_STATUS.hired).toBe("hired");
        expect(COMPANY_STAGE_TO_STATUS.rejected).toBe("rejected_client");
    });

    it("leaves status unchanged for 'viewed' (still under review to the recruiter)", () => {
        expect(COMPANY_STAGE_TO_STATUS.viewed).toBeNull();
    });

    it("has an explicit entry for every company stage (no silent omissions)", () => {
        for (const stage of COMPANY_STAGES) {
            expect(Object.prototype.hasOwnProperty.call(COMPANY_STAGE_TO_STATUS, stage)).toBe(true);
        }
        expect(Object.keys(COMPANY_STAGE_TO_STATUS).sort()).toEqual([...COMPANY_STAGES].sort());
    });
});
