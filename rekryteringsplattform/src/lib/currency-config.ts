// Per-currency pricing/display config — the single source of truth for the
// supported currencies, their minimum recruitment fee (the economic backstop
// inside calculateClientFee) and the calculator's slider bounds.
//
// minSalary is slider UX only — the server never rejects a salary below it;
// the minimum FEE is what protects the economics. maxSalary/step are display
// bounds for the calculator slider. Values per business decision 2026-08-27;
// step is 500 for every currency (Sajid 2026-09-06, supersedes the 10 000 Nordic step).

export const SUPPORTED_CURRENCIES = ["SEK", "EUR", "USD", "GBP", "NOK", "DKK", "ISK"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export interface CurrencyConfig {
    minSalary: number;
    maxSalary: number;
    step: number;
    minFee: number;
    /** Minimum recruiter fee (0.7× minFee) — the recruiter-side economic floor. */
    recruiterMinFee: number;
    /** Prefix symbol; currencies without one render as a code suffix. */
    symbol?: string;
}

export const CURRENCY_CONFIG: Record<Currency, CurrencyConfig> = {
    SEK: { minSalary: 300_000, maxSalary: 3_000_000, step: 500, minFee: 40_000, recruiterMinFee: 28_000 },
    NOK: { minSalary: 400_000, maxSalary: 3_000_000, step: 500, minFee: 45_000, recruiterMinFee: 31_500 },
    DKK: { minSalary: 300_000, maxSalary: 3_000_000, step: 500, minFee: 30_000, recruiterMinFee: 21_000 },
    ISK: { minSalary: 5_000_000, maxSalary: 30_000_000, step: 500, minFee: 550_000, recruiterMinFee: 385_000 },
    EUR: { minSalary: 25_000, maxSalary: 200_000, step: 500, minFee: 3_500, recruiterMinFee: 2_450, symbol: "€" },
    GBP: { minSalary: 28_000, maxSalary: 200_000, step: 500, minFee: 3_000, recruiterMinFee: 2_100, symbol: "£" },
    USD: { minSalary: 45_000, maxSalary: 300_000, step: 500, minFee: 4_000, recruiterMinFee: 2_800, symbol: "$" },
};

export function isCurrency(v: unknown): v is Currency {
    return typeof v === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(v);
}

/** Unknown/legacy currency values fall back to EUR (the pre-multi-currency model). */
export function normalizeCurrency(v: unknown): Currency {
    return isCurrency(v) ? v : "EUR";
}

/** Clamp a salary into the currency's slider range — never convert between currencies. */
export function clampSalaryToCurrency(salary: number, currency: Currency): number {
    const { minSalary, maxSalary } = CURRENCY_CONFIG[currency];
    if (!Number.isFinite(salary) || salary <= 0) return minSalary;
    return Math.min(Math.max(salary, minSalary), maxSalary);
}

/**
 * +/- stepper for the calculator: one step in the pressed direction, snapped to
 * the step grid (305 200 → 305 500 / 305 000) and clamped to the slider range.
 */
export function stepSalary(salary: number, currency: Currency, direction: 1 | -1): number {
    const { step } = CURRENCY_CONFIG[currency];
    const next = direction > 0
        ? Math.floor(salary / step) * step + step
        : Math.ceil(salary / step) * step - step;
    return clampSalaryToCurrency(next, currency);
}

const groupFmt = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

/** "€25 000" for symbol currencies, "300 000 SEK" for the rest (sv-SE grouping). */
export function formatMoney(amount: number, currency: Currency): string {
    const { symbol } = CURRENCY_CONFIG[currency];
    const grouped = groupFmt.format(amount);
    return symbol ? `${symbol}${grouped}` : `${grouped} ${currency}`;
}
