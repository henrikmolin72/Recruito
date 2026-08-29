// Client & recruiter fee percentages are guarantee-model derived — see
// clientFeePercent / recruiterFeePercent in utils.ts. The old volume-tier model
// (PRICING_TIERS / getFeePercentage) was removed 2026-08-29 as it disagreed with
// the locked *_fee_amount it was supposed to mirror.

/** Rolling window in months for recent-placement counting. */
export const TIER_WINDOW_MONTHS = 12;

/**
 * Placement statuses that do NOT count as successful placements — excluded
 * from the dashboard stat and from tier/fee placement counts.
 */
export const FAILED_PLACEMENT_STATUSES = ["guarantee_failed", "refund_processing"] as const;

/** PostgREST `in`-filter string for excluding failed placements via `.not("status", "in", ...)`. */
export const FAILED_PLACEMENT_STATUSES_FILTER = `(${FAILED_PLACEMENT_STATUSES.join(",")})`;
