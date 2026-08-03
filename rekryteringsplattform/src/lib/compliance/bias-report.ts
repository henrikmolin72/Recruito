// EU AI Act bias monitoring. Derived on read from live candidate rows — see the
// note in /api/compliance/bias-report for why ai_bias_reports is not used.
//
// These are PROXY signals. We do not collect gender, age or ethnicity, so we
// cannot measure outcomes against protected characteristics directly; experience
// band and location are the only group dimensions we actually hold.
import { candidateReachedInterview } from "@/lib/mandate-stages";

export type BiasCandidate = {
    status: string | null;
    ai_match_score: number | null;
    years_experience: number | null;
    location_city: string | null;
};

export type BiasFlag = {
    type: string;
    severity: "warning" | "critical";
    detail: string;
};

export type BiasReport = {
    id: string;
    job_id: string;
    report_date: string;
    total_screened: number;
    total_shortlisted: number;
    score_distribution: Record<string, number>;
    experience_distribution: Record<string, { screened: number; shortlisted: number }>;
    location_distribution: Record<string, { screened: number; shortlisted: number }>;
    flags: BiasFlag[];
};

// A group smaller than this is noise, not a pattern — flagging it would bury the
// real signal under every one-candidate bucket.
const MIN_GROUP_SIZE = 5;
// Percentage points away from the job's overall shortlist rate. Matches the
// threshold published in the AI policy — keep the two in sync.
const FLAG_DEVIATION_PP = 20;

function scoreBucket(score: number): string {
    if (score <= 25) return "0-25";
    if (score <= 50) return "26-50";
    if (score <= 75) return "51-75";
    return "76-100";
}

function experienceBucket(years: number | null): string {
    if (years === null) return "unknown";
    if (years <= 2) return "0-2";
    if (years <= 5) return "3-5";
    if (years <= 10) return "6-10";
    return "10+";
}

function tally(
    rows: BiasCandidate[],
    key: (c: BiasCandidate) => string
): Record<string, { screened: number; shortlisted: number }> {
    const out: Record<string, { screened: number; shortlisted: number }> = {};
    for (const c of rows) {
        const k = key(c);
        out[k] ??= { screened: 0, shortlisted: 0 };
        out[k].screened += 1;
        if (candidateReachedInterview(c)) out[k].shortlisted += 1;
    }
    return out;
}

function flagSkew(
    dimension: string,
    dist: Record<string, { screened: number; shortlisted: number }>,
    overallRate: number
): BiasFlag[] {
    const flags: BiasFlag[] = [];
    for (const [group, { screened, shortlisted }] of Object.entries(dist)) {
        if (group === "unknown" || screened < MIN_GROUP_SIZE) continue;
        const rate = (shortlisted / screened) * 100;
        const deviation = rate - overallRate;
        if (Math.abs(deviation) < FLAG_DEVIATION_PP) continue;
        flags.push({
            type: `${dimension}_skew`,
            severity: Math.abs(deviation) >= 40 ? "critical" : "warning",
            detail:
                `${group}: ${shortlisted}/${screened} shortlisted (${rate.toFixed(0)}%), ` +
                `${deviation > 0 ? "+" : ""}${deviation.toFixed(0)} points vs the ` +
                `job average of ${overallRate.toFixed(0)}%.`,
        });
    }
    return flags;
}

/**
 * Build a bias report from the AI-screened candidates on one job.
 * `screened` must already be filtered to rows with a non-null ai_match_score —
 * an unscored candidate was never put through the AI, so counting it would
 * understate the shortlist rate of the system we are actually monitoring.
 */
export function buildBiasReport(
    jobId: string,
    screened: BiasCandidate[],
    today = new Date()
): BiasReport {
    const shortlisted = screened.filter(candidateReachedInterview);
    const overallRate = (shortlisted.length / screened.length) * 100;

    const score_distribution: Record<string, number> = {};
    for (const c of screened) {
        const b = scoreBucket(c.ai_match_score as number);
        score_distribution[b] = (score_distribution[b] ?? 0) + 1;
    }

    const experience_distribution = tally(screened, (c) => experienceBucket(c.years_experience));
    const location_distribution = tally(screened, (c) => c.location_city?.trim() || "unknown");

    return {
        id: `computed:${jobId}`,
        job_id: jobId,
        report_date: today.toISOString().slice(0, 10),
        total_screened: screened.length,
        total_shortlisted: shortlisted.length,
        score_distribution,
        experience_distribution,
        location_distribution,
        flags: [
            ...flagSkew("experience", experience_distribution, overallRate),
            ...flagSkew("location", location_distribution, overallRate),
        ],
    };
}
