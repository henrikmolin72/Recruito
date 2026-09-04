import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Spec for multi-currency pricing (written red-first, 2026-08-27):
//   - One CURRENCY_CONFIG map (7 currencies incl. ISK) with per-currency
//     minimum salary (slider floor, UX only) and minimum recruitment FEE
//     (the economic backstop applied inside calculateClientFee).
//   - Exclusive is its own flat rate (10/11/12%), NOT a ×0.9 discount on the
//     standard 11/12/13% — the exclusive expectations below fail under the
//     old multiplicative model by design.
//   - fee = max(salary × pct, minFee[currency]); currency is REQUIRED.
// Values mirror the agreed minimums table 1:1.
// ---------------------------------------------------------------------------

import {
    SUPPORTED_CURRENCIES,
    CURRENCY_CONFIG,
    isCurrency,
    normalizeCurrency,
    clampSalaryToCurrency,
    formatMoney,
    stepSalary,
    type Currency,
} from "./currency-config";
import { calculateClientFee } from "./utils";

describe("CURRENCY_CONFIG", () => {
    it("covers exactly the 7 supported currencies", () => {
        expect([...SUPPORTED_CURRENCIES].sort()).toEqual(
            ["DKK", "EUR", "GBP", "ISK", "NOK", "SEK", "USD"],
        );
    });

    // The agreed minimums table, verbatim.
    it.each([
        ["SEK", 300_000, 40_000],
        ["NOK", 400_000, 45_000],
        ["DKK", 300_000, 30_000],
        ["ISK", 5_000_000, 550_000],
        ["EUR", 25_000, 3_500],
        ["GBP", 28_000, 3_000],
        ["USD", 45_000, 4_000],
    ] as [Currency, number, number][])(
        "%s: min salary %d, min fee %d",
        (currency, minSalary, minFee) => {
            expect(CURRENCY_CONFIG[currency].minSalary).toBe(minSalary);
            expect(CURRENCY_CONFIG[currency].minFee).toBe(minFee);
        },
    );

    it("guards currency values (isCurrency / normalizeCurrency)", () => {
        expect(isCurrency("SEK")).toBe(true);
        expect(isCurrency("JPY")).toBe(false);
        expect(isCurrency(null)).toBe(false);
        expect(normalizeCurrency("ISK")).toBe("ISK");
        expect(normalizeCurrency("JPY")).toBe("EUR");
        expect(normalizeCurrency(undefined)).toBe("EUR");
    });

    // Client ask 2026-09-04: +/- moves the salary by 10 000 for the Nordic currencies.
    it.each(["SEK", "NOK", "DKK", "ISK"] as Currency[])("%s slider/stepper step is 10 000", (currency) => {
        expect(CURRENCY_CONFIG[currency].step).toBe(10_000);
    });
});

describe("calculateClientFee — standard rate 11/12/13%", () => {
    it.each([
        [0, 11_000],
        [1, 12_000],
        [2, 13_000],
    ])("EUR 100k, %d mo guarantee → %d", (months, fee) => {
        expect(calculateClientFee(100_000, months, false, "EUR")).toBe(fee);
    });

    it("clamps guarantee months to 0–2", () => {
        expect(calculateClientFee(100_000, 5, false, "EUR")).toBe(13_000);
        expect(calculateClientFee(100_000, -1, false, "EUR")).toBe(11_000);
    });

    it("returns 0 for zero/negative salary", () => {
        expect(calculateClientFee(0, 0, false, "EUR")).toBe(0);
        expect(calculateClientFee(-5, 0, false, "SEK")).toBe(0);
    });
});

describe("calculateClientFee — exclusive is a flat 10/11/12% rate (not ×0.9)", () => {
    // Old model gave 9 900 / 10 800 / 11 700 here — these discriminate.
    it.each([
        [0, 10_000],
        [1, 11_000],
        [2, 12_000],
    ])("EUR 100k exclusive, %d mo guarantee → %d", (months, fee) => {
        expect(calculateClientFee(100_000, months, true, "EUR")).toBe(fee);
    });
});

describe("calculateClientFee — per-currency minimum fee", () => {
    it.each([
        // below the minimum → exact minimum fee, in that currency
        ["SEK", 300_000, 40_000], // 33 000 raw → floored to 40 000
        ["NOK", 400_000, 45_000], // 44 000 raw → floored to 45 000
        ["ISK", 4_000_000, 550_000], // 440 000 raw → floored
        ["EUR", 25_000, 3_500], // 2 750 raw → floored
        ["GBP", 25_000, 3_000], // 2 750 raw → floored
        ["USD", 30_000, 4_000], // 3 300 raw → floored
    ] as [Currency, number, number][])(
        "%s salary %d (standard, 0 mo) floors to the currency minimum %d",
        (currency, salary, minFee) => {
            expect(calculateClientFee(salary, 0, false, currency)).toBe(minFee);
        },
    );

    it.each([
        // above the minimum → raw percentage wins
        ["SEK", 500_000, 55_000],
        ["DKK", 300_000, 33_000], // DKK min salary already clears its 30 000 min fee
        ["ISK", 6_000_000, 660_000],
        ["EUR", 40_000, 4_400],
        ["GBP", 28_000, 3_080], // GBP min salary clears its 3 000 min fee
        ["USD", 45_000, 4_950],
    ] as [Currency, number, number][])(
        "%s salary %d (standard, 0 mo) → raw fee %d",
        (currency, salary, fee) => {
            expect(calculateClientFee(salary, 0, false, currency)).toBe(fee);
        },
    );

    it("exclusive rate can land exactly on the minimum (SEK 400k × 10% = 40 000)", () => {
        expect(calculateClientFee(400_000, 0, true, "SEK")).toBe(40_000);
    });

    it("ISK at its minimum salary lands exactly on its minimum fee (5M × 11%)", () => {
        expect(calculateClientFee(5_000_000, 0, false, "ISK")).toBe(550_000);
    });
});

describe("clampSalaryToCurrency", () => {
    it("keeps in-range values unchanged", () => {
        expect(clampSalaryToCurrency(44_000, "EUR")).toBe(44_000);
        expect(clampSalaryToCurrency(500_000, "SEK")).toBe(500_000);
    });

    it("raises below-minimum values to the currency minimum (EUR→ISK switch)", () => {
        expect(clampSalaryToCurrency(44_000, "ISK")).toBe(5_000_000);
    });

    it("lowers above-maximum values to the currency maximum (SEK→EUR switch)", () => {
        expect(clampSalaryToCurrency(300_000, "EUR")).toBe(CURRENCY_CONFIG.EUR.maxSalary);
    });

    it("falls back to the currency minimum for invalid input", () => {
        expect(clampSalaryToCurrency(NaN, "GBP")).toBe(CURRENCY_CONFIG.GBP.minSalary);
        expect(clampSalaryToCurrency(0, "USD")).toBe(CURRENCY_CONFIG.USD.minSalary);
    });
});

describe("formatMoney", () => {
    it("prefixes symbol currencies (sv-SE grouping)", () => {
        expect(formatMoney(25_000, "EUR")).toBe("€25 000");
        expect(formatMoney(3_000, "GBP")).toBe("£3 000");
        expect(formatMoney(45_000, "USD")).toBe("$45 000");
    });

    it("suffixes the code for the rest", () => {
        expect(formatMoney(300_000, "SEK")).toBe("300 000 SEK");
        expect(formatMoney(5_000_000, "ISK")).toBe("5 000 000 ISK");
    });
});

describe("stepSalary — +/- one step, snapped to the grid, clamped to the slider range", () => {
    it("moves by one step from a grid value", () => {
        expect(stepSalary(300_000, "SEK", 1)).toBe(310_000);
        expect(stepSalary(310_000, "SEK", -1)).toBe(300_000);
        expect(stepSalary(5_000_000, "ISK", 1)).toBe(5_010_000);
        expect(stepSalary(25_000, "EUR", 1)).toBe(25_500);
    });
    it("snaps an off-grid value to the next grid point in the pressed direction", () => {
        expect(stepSalary(305_000, "SEK", 1)).toBe(310_000);
        expect(stepSalary(305_000, "SEK", -1)).toBe(300_000);
    });
    it("clamps at the slider bounds", () => {
        expect(stepSalary(300_000, "SEK", -1)).toBe(300_000);
        expect(stepSalary(3_000_000, "SEK", 1)).toBe(3_000_000);
    });
});
