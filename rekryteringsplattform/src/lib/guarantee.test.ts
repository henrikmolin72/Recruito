import { describe, it, expect } from "vitest";
import { computeProportionalRefund } from "./guarantee";

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
