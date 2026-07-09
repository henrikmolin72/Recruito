/**
 * Proportional guarantee-breach refund calculation.
 *
 * The company chooses a 1–2 month guarantee per job (jobs.guarantee_period_months).
 * On a breach we refund the unused fraction of the guarantee window:
 *   fraction = remainingDays / totalDays, clamped to [0, 1].
 *
 * The real window is the placement's start_date → guarantee_end_date. If the
 * start date is missing we fall back to a 2-month (max) window — conservative,
 * and the [0,1] clamp guarantees the refund can never exceed total_fee.
 */
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const FALLBACK_GUARANTEE_DAYS = 60; // 2 months, the maximum a company can pick

/**
 * Guarantee Ends = joining date + N whole months, with month-end overflow
 * clamped to the last day of the target month (matches Postgres
 * `date + 'N months'::interval`: Jan 31 + 1 month = Feb 28).
 * Dates are YYYY-MM-DD strings; months is jobs.guarantee_period_months.
 */
export function computeGuaranteeEndDate(joiningDate: string, months: number): string {
    const [y, m, d] = joiningDate.split("-").map(Number);
    const targetMonth = m - 1 + months; // 0-indexed
    const lastDayOfTarget = new Date(Date.UTC(y, targetMonth + 1, 0)).getUTCDate();
    const end = new Date(Date.UTC(y, targetMonth, Math.min(d, lastDayOfTarget)));
    return end.toISOString().slice(0, 10);
}

export type GuaranteeDisplayStatus = "active" | "completed" | "failed" | "pending";

/**
 * Client-facing guarantee state, derived from the placement rather than the
 * raw invoice-chain status: the guarantee runs from the confirmed joining
 * date (admin-entered) to guarantee_end_date, independent of invoicing.
 */
export function guaranteeDisplayStatus(
    placement: { status: string; joining_date: string | null; guarantee_end_date: string | null },
    now: Date = new Date(),
): GuaranteeDisplayStatus {
    if (placement.status === "guarantee_failed" || placement.status === "refund_processing") return "failed";
    const endPassed = placement.guarantee_end_date && new Date(placement.guarantee_end_date) <= now;
    if (placement.status === "payout_released" || endPassed) return "completed";
    if (placement.joining_date && placement.guarantee_end_date) return "active";
    return "pending";
}

export function computeProportionalRefund(
    totalFee: number,
    startDate: string | null | undefined,
    endDate: string,
    now: Date = new Date(),
): number {
    const end = new Date(endDate);
    const start = startDate
        ? new Date(startDate)
        : new Date(end.getTime() - FALLBACK_GUARANTEE_DAYS * MS_PER_DAY);

    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / MS_PER_DAY);
    const remainingDays = Math.min(
        totalDays,
        Math.max(0, (end.getTime() - now.getTime()) / MS_PER_DAY),
    );
    const fraction = remainingDays / totalDays;
    return Math.round(totalFee * fraction);
}
