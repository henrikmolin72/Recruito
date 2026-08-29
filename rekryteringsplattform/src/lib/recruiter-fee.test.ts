import { describe, it, expect } from "vitest";
// Spec: Sajid 2026-08-28 — recruiter fee is guarantee-tiered 6/6.5/7% of annual
// base salary, rounded to the nearest 10 (half-up), with a per-currency minimum.
// Client fee % is unchanged; only its rounding moves to nearest-10.
import { calculateRecruiterFee, calculateClientFee, roundToTen } from "./utils";
import { CURRENCY_CONFIG, type Currency } from "./currency-config";

describe("roundToTen — nearest 10, midpoints up (Sajid's table)", () => {
    it.each([
        [435, 440],
        [510, 510],
        [524, 520],
        [525, 530],
        [526, 530],
        [0, 0],
    ])("%d → %d", (input, expected) => {
        expect(roundToTen(input)).toBe(expected);
    });
});

describe("calculateRecruiterFee — guarantee-tiered 6 / 6.5 / 7%", () => {
    it.each([
        [0, 6_000],
        [1, 6_500],
        [2, 7_000],
    ])("EUR 100k, %d mo guarantee → %d", (months, fee) => {
        expect(calculateRecruiterFee(100_000, months, "EUR")).toBe(fee);
    });

    it("clamps guarantee months to 0–2", () => {
        expect(calculateRecruiterFee(100_000, 5, "EUR")).toBe(7_000);
        expect(calculateRecruiterFee(100_000, -1, "EUR")).toBe(6_000);
    });

    it("rounds to the nearest 10 (87 600 × 6% = 5 256 → 5 260)", () => {
        expect(calculateRecruiterFee(87_600, 0, "EUR")).toBe(5_260);
    });

    it("returns 0 for zero/negative salary", () => {
        expect(calculateRecruiterFee(0, 0, "EUR")).toBe(0);
        expect(calculateRecruiterFee(-5, 2, "SEK")).toBe(0);
    });

    it("raw percentage wins when above the minimum (SEK 500k × 7% = 35 000)", () => {
        expect(calculateRecruiterFee(500_000, 2, "SEK")).toBe(35_000);
    });
});

describe("calculateRecruiterFee — per-currency minimum (0.7× the client min)", () => {
    // recruiterMinFee table; a below-threshold salary floors to it.
    it.each([
        ["EUR", 25_000, 2_450],
        ["SEK", 300_000, 28_000],
        ["NOK", 400_000, 31_500],
        ["DKK", 300_000, 21_000],
        ["GBP", 28_000, 2_100],
        ["USD", 45_000, 2_800],
        ["ISK", 5_000_000, 385_000],
    ] as [Currency, number, number][])(
        "%s salary %d (0 mo) floors to recruiter min %d",
        (currency, salary, min) => {
            expect(CURRENCY_CONFIG[currency].recruiterMinFee).toBe(min);
            expect(calculateRecruiterFee(salary, 0, currency)).toBe(min);
        },
    );
});

describe("calculateClientFee — rounding now to nearest 10 (% unchanged)", () => {
    it("rounds a non-round raw fee to the nearest 10 (45 050 × 11% = 4 955.5 → 4 960)", () => {
        expect(calculateClientFee(45_050, 0, false, "EUR")).toBe(4_960);
    });
});
