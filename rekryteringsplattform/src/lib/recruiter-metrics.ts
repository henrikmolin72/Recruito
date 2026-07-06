/**
 * Pure mapping for recruiter performance metrics (pins behavior of the
 * load-bearing getRecruiterPerformanceMetrics in actions/placements.ts).
 */

export interface RecruiterPerfRow {
    total_placements: number | null;
    rating: number | null;
    perf_hire_rate: number | null;
    perf_avg_time_to_hire_days: number | null;
    perf_candidates_submitted: number | null;
    perf_candidates_hired: number | null;
    perf_active_placements: number | null;
    perf_guarantee_success_rate: number | null;
}

export function mapRecruiterPerfRow(row: RecruiterPerfRow) {
    return {
        totalPlacements: row.total_placements ?? 0,
        rating: row.rating ?? 0,
        hireRate: row.perf_hire_rate ?? 0,
        avgTimeToHireDays: row.perf_avg_time_to_hire_days ?? 0,
        candidatesSubmitted: row.perf_candidates_submitted ?? 0,
        candidatesHired: row.perf_candidates_hired ?? 0,
        activePlacements: row.perf_active_placements ?? 0,
        // null = no guarantee has ever completed for this recruiter; render "—", never a fake 100%
        guaranteeSuccessRate: row.perf_guarantee_success_rate ?? null,
    };
}

/** Average guarantee success rate across recruiters, ignoring those with no completed guarantees. */
export function averageGuaranteeRate(rates: Array<number | null>): number | null {
    const known = rates.filter((r): r is number => r != null);
    if (known.length === 0) return null;
    return known.reduce((sum, r) => sum + r, 0) / known.length;
}
