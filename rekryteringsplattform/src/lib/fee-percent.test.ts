import { describe, it, expect } from "vitest";
// Reconciliation (2026-08-29): the stored fee_percentage / recruiter_fee_percentage
// columns must be DERIVED from the guarantee model so they can never disagree with
// the locked *_fee_amount. clientFeePercent/recruiterFeePercent are the single
// source for those columns — replacing the old volume-tier getFeePercentage (12/13/15).
import {
    clientFeePercent,
    recruiterFeePercent,
    calculateClientFee,
    calculateRecruiterFee,
} from "./utils";

describe("clientFeePercent — 11/12/13 standard, 10/11/12 exclusive", () => {
    it.each([
        [0, false, 11],
        [1, false, 12],
        [2, false, 13],
        [0, true, 10],
        [1, true, 11],
        [2, true, 12],
    ])("%d mo, exclusive=%s → %d%%", (months, excl, pct) => {
        expect(clientFeePercent(months, excl)).toBe(pct);
    });

    it("clamps guarantee months to 0–2", () => {
        expect(clientFeePercent(5, false)).toBe(13);
        expect(clientFeePercent(-1, false)).toBe(11);
    });
});

describe("recruiterFeePercent — 6 / 6.5 / 7", () => {
    it.each([
        [0, 6],
        [1, 6.5],
        [2, 7],
    ])("%d mo → %d%%", (months, pct) => {
        expect(recruiterFeePercent(months)).toBe(pct);
    });

    it("clamps guarantee months to 0–2", () => {
        expect(recruiterFeePercent(5)).toBe(7);
        expect(recruiterFeePercent(-1)).toBe(6);
    });
});

// The invariant that makes the reconciliation correct: the derived % and the
// locked amount agree (salary above every min-fee floor, and round so that
// %·salary is an exact multiple of 10 — no rounding drift).
describe("derived % agrees with the locked fee amount", () => {
    const salary = 100_000; // EUR, above every min fee
    it.each([
        [0, false],
        [1, false],
        [2, false],
        [0, true],
        [2, true],
    ])("client: %d mo excl=%s", (months, excl) => {
        expect(calculateClientFee(salary, months, excl, "EUR")).toBe(
            salary * (clientFeePercent(months, excl) / 100),
        );
    });

    it.each([[0], [1], [2]])("recruiter: %d mo", (months) => {
        expect(calculateRecruiterFee(salary, months, "EUR")).toBe(
            Math.round(salary * (recruiterFeePercent(months) / 100)),
        );
    });
});
