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
