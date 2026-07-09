import { describe, it, expect } from "vitest";
import { computeProportionalRefund, computeGuaranteeEndDate, guaranteeDisplayStatus } from "./guarantee";

describe("computeProportionalRefund", () => {
    const fee = 30000;

    it("never exceeds the total fee for a long guarantee with far-off end (regression: 3x refund bug)", () => {
        // 2-month window, 90 days still 'remaining' would have produced 3x before the clamp/start fix.
        const start = "2026-01-01";
        const end = "2026-03-02"; // ~60 days
        const now = new Date("2025-12-03"); // 90 days before end
        const refund = computeProportionalRefund(fee, start, end, now);
        expect(refund).toBeLessThanOrEqual(fee);
        expect(refund).toBe(fee); // before start → full window remaining → full refund, capped
    });

    it("refunds the unused fraction of the real start→end window", () => {
        const start = "2026-01-01";
        const end = "2026-03-02"; // 60 days total (Feb 2026 has 28 days)
        const now = new Date("2026-02-01"); // 29 days before end → 29/60
        const refund = computeProportionalRefund(fee, start, end, now);
        expect(refund).toBe(Math.round(fee * (29 / 60)));
    });

    it("returns 0 once the guarantee has fully elapsed", () => {
        const refund = computeProportionalRefund(fee, "2026-01-01", "2026-03-02", new Date("2026-04-01"));
        expect(refund).toBe(0);
    });

    it("falls back to a 2-month window and stays capped when start_date is missing", () => {
        const end = "2026-03-02";
        const now = new Date("2025-01-01"); // way before → clamps to full window
        const refund = computeProportionalRefund(fee, null, end, now);
        expect(refund).toBeLessThanOrEqual(fee);
    });
});

describe("computeGuaranteeEndDate", () => {
    it("adds whole months to the joining date", () => {
        expect(computeGuaranteeEndDate("2026-07-09", 1)).toBe("2026-08-09");
        expect(computeGuaranteeEndDate("2026-07-09", 2)).toBe("2026-09-09");
    });

    it("clamps month-end overflow like Postgres interval math (Jan 31 + 1 month = Feb 28)", () => {
        expect(computeGuaranteeEndDate("2026-01-31", 1)).toBe("2026-02-28");
        expect(computeGuaranteeEndDate("2024-01-31", 1)).toBe("2024-02-29"); // leap year
        expect(computeGuaranteeEndDate("2026-08-31", 1)).toBe("2026-09-30");
    });

    it("rolls over year boundaries", () => {
        expect(computeGuaranteeEndDate("2026-12-15", 2)).toBe("2027-02-15");
    });

    it("returns the joining date unchanged for a 0-month guarantee", () => {
        expect(computeGuaranteeEndDate("2026-07-09", 0)).toBe("2026-07-09");
    });
});

describe("guaranteeDisplayStatus", () => {
    const today = new Date("2026-07-09");

    it("maps failure statuses to failed regardless of dates", () => {
        expect(guaranteeDisplayStatus({ status: "guarantee_failed", joining_date: "2026-06-01", guarantee_end_date: "2026-08-01" }, today)).toBe("failed");
        expect(guaranteeDisplayStatus({ status: "refund_processing", joining_date: null, guarantee_end_date: null }, today)).toBe("failed");
    });

    it("is completed when the payout is released or the end date has passed", () => {
        expect(guaranteeDisplayStatus({ status: "payout_released", joining_date: "2026-01-01", guarantee_end_date: "2026-03-01" }, today)).toBe("completed");
        expect(guaranteeDisplayStatus({ status: "guarantee_active", joining_date: "2026-05-01", guarantee_end_date: "2026-07-01" }, today)).toBe("completed");
    });

    it("is active while the joining date is set and the end date is in the future", () => {
        expect(guaranteeDisplayStatus({ status: "guarantee_active", joining_date: "2026-07-01", guarantee_end_date: "2026-08-01" }, today)).toBe("active");
        // guarantee runs from joining even if the invoice is still unpaid
        expect(guaranteeDisplayStatus({ status: "invoice_sent", joining_date: "2026-07-01", guarantee_end_date: "2026-08-01" }, today)).toBe("active");
    });

    it("is pending until a joining date is entered", () => {
        expect(guaranteeDisplayStatus({ status: "confirmed", joining_date: null, guarantee_end_date: null }, today)).toBe("pending");
        expect(guaranteeDisplayStatus({ status: "payment_received", joining_date: null, guarantee_end_date: null }, today)).toBe("pending");
    });
});
