import { describe, it, expect } from "vitest";
import { companyStageBucket, COMPANY_STAGE_BUCKETS } from "./company-candidate-buckets";
import { ALL_CANDIDATE_STATUSES } from "./candidate-workflow";

// Pins the 2026-07-08 company-view rebuild contract: no Presented/Paused buckets,
// on_hold folds into Under Review, Final Interview folds into Interview.
describe("companyStageBucket", () => {
  it("folds on_hold (and legacy paused) into under_review — never a paused bucket", () => {
    expect(companyStageBucket("on_hold")).toBe("under_review");
    expect(companyStageBucket("paused")).toBe("under_review");
  });

  it("folds final_interview into interview", () => {
    expect(companyStageBucket("final_interview")).toBe("interview");
    expect(companyStageBucket("interview_stage_1")).toBe("interview");
    expect(companyStageBucket("interview")).toBe("interview"); // legacy
  });

  it("buckets review-phase statuses into under_review (no presented bucket)", () => {
    for (const s of ["submitted", "under_client_review", "info_requested", "resubmitted", "reviewing"]) {
      expect(companyStageBucket(s)).toBe("under_review");
    }
  });

  it("buckets offer / hired / rejected / withdrawn", () => {
    expect(companyStageBucket("offer_in_progress")).toBe("offered");
    expect(companyStageBucket("offer_accepted")).toBe("offered");
    expect(companyStageBucket("hired")).toBe("hired");
    expect(companyStageBucket("invoice_enabled")).toBe("hired");
    expect(companyStageBucket("guarantee_tracking")).toBe("hired");
    expect(companyStageBucket("completed")).toBe("hired");
    expect(companyStageBucket("rejected_client")).toBe("rejected");
    expect(companyStageBucket("rejected_interview")).toBe("rejected");
    expect(companyStageBucket("offer_declined")).toBe("rejected");
    expect(companyStageBucket("declined")).toBe("rejected"); // legacy → offer_declined
    expect(companyStageBucket("candidate_withdrawn")).toBe("withdrawn");
  });

  it("maps EVERY known status to one of the six buckets — presented/paused do not exist", () => {
    const buckets = new Set<string>(COMPANY_STAGE_BUCKETS);
    expect(buckets.has("paused")).toBe(false);
    expect(buckets.has("presented")).toBe(false);
    expect(buckets.has("submitted")).toBe(false);
    for (const s of ALL_CANDIDATE_STATUSES) {
      expect(buckets.has(companyStageBucket(s))).toBe(true);
    }
  });
});
