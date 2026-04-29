import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Statuses that count as "AI screened" (applications table)
const INTERVIEWED_STATUSES = new Set([
    "interview", "interview_stage_1", "interview_stage_2",
    "interview_stage_3", "final_interview",
    "offered", "offer_in_progress", "offer_accepted", "offer_declined",
    "rejected_interview", "hired", "offer_declined",
    "invoice_enabled", "guarantee_tracking", "guarantee_period", "completed",
]);
const OFFERED_STATUSES = new Set([
    "offered", "offer_in_progress", "offer_accepted", "offer_declined",
    "invoice_enabled", "guarantee_tracking", "guarantee_period", "completed",
]);
const HIRED_STATUSES = new Set([
    "hired", "invoice_enabled", "guarantee_tracking", "guarantee_period", "completed",
]);

function daysBetween(a: string | null, b: string | null): number | null {
    if (!a || !b) return null;
    const diff = new Date(b).getTime() - new Date(a).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const jobId = request.nextUrl.searchParams.get("jobId"); // optional filter

    const admin = createAdminClient();

    // Get company
    const { data: company } = await admin
        .from("companies")
        .select("id, company_name, industry")
        .eq("user_id", user.id)
        .single();

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    // Get jobs
    let jobsQuery = admin
        .from("jobs")
        .select("id, title, salary_min, salary_max, salary_currency, fee_percentage, client_fee_amount, is_exclusive, guarantee_period_months, published_at, filled_at, created_at, status")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

    if (jobId) jobsQuery = jobsQuery.eq("id", jobId);

    const { data: jobs } = await jobsQuery;
    if (!jobs || jobs.length === 0) {
        return NextResponse.json({ funnel: [], timings: [], costs: [], recruiterPerf: [], summary: {} });
    }

    const jobIds = jobs.map((j) => j.id);

    // Get candidates
    const { data: candidates } = await admin
        .from("candidates")
        .select(`
            id, job_id, recruiter_id, status,
            submitted_at, reviewed_at, interview_at, offered_at, hired_at,
            ai_match_score, mandate_id
        `)
        .in("job_id", jobIds);

    // Get AI screenings for applications
    const { data: screenings } = await admin
        .from("ai_screenings")
        .select("application_id, match_score")
        .in("job_id", jobIds);

    // Get placements
    const { data: placements } = await admin
        .from("placements")
        .select("id, job_id, candidate_id, annual_salary, salary_currency, fee_percentage, total_fee, recruiter_fee, created_at")
        .in("job_id", jobIds);

    // Get mandates + recruiters for performance
    const { data: mandates } = await admin
        .from("job_mandates")
        .select(`
            id, job_id, recruiter_id, created_at, is_active,
            recruiter:recruiters(id, profile:profiles!recruiters_user_id_fkey(full_name))
        `)
        .in("job_id", jobIds);

    // ── A) HIRING FUNNEL per job ─────────────────────────────────────────────
    const funnel = jobs.map((job) => {
        const jc = (candidates ?? []).filter((c) => c.job_id === job.id);
        const total = jc.length;
        const interviewed = jc.filter((c) => INTERVIEWED_STATUSES.has(c.status)).length;
        const offered = jc.filter((c) => OFFERED_STATUSES.has(c.status)).length;
        const hired = jc.filter((c) => HIRED_STATUSES.has(c.status)).length;
        const aiScored = jc.filter((c) => c.ai_match_score != null).length;

        return {
            jobId: job.id,
            jobTitle: job.title,
            status: job.status,
            submitted: total,
            aiScreened: aiScored,
            aiScreenedPct: total > 0 ? Math.round((aiScored / total) * 100) : 0,
            interviewed,
            interviewedPct: total > 0 ? Math.round((interviewed / total) * 100) : 0,
            offered,
            offeredPct: total > 0 ? Math.round((offered / total) * 100) : 0,
            hired,
            hiredPct: total > 0 ? Math.round((hired / total) * 100) : 0,
        };
    });

    // ── B) TIME-TO-HIRE ──────────────────────────────────────────────────────
    const timings = (candidates ?? [])
        .filter((c) => HIRED_STATUSES.has(c.status) && c.submitted_at && c.hired_at)
        .map((c) => {
            const job = jobs.find((j) => j.id === c.job_id);
            return {
                jobId: c.job_id,
                jobTitle: job?.title ?? "",
                daysToInterview: daysBetween(c.submitted_at, c.interview_at),
                daysToOffer: daysBetween(c.interview_at, c.offered_at),
                daysToHire: daysBetween(c.submitted_at, c.hired_at),
                publishToFirst: daysBetween(job?.published_at ?? null, c.submitted_at),
            };
        });

    const avgDaysToHire = timings.length > 0
        ? Math.round(timings.reduce((a, t) => a + (t.daysToHire ?? 0), 0) / timings.length)
        : null;
    const avgDaysToInterview = timings.length > 0
        ? Math.round(timings.filter(t => t.daysToInterview != null).reduce((a, t) => a + (t.daysToInterview ?? 0), 0) / timings.filter(t => t.daysToInterview != null).length)
        : null;

    // ── C) COST ANALYSIS ────────────────────────────────────────────────────
    // Traditional agency = 20% of annual salary, Recruito = fee_percentage
    const TRADITIONAL_PCT = 20;
    const costs = (placements ?? []).map((p) => {
        const job = jobs.find((j) => j.id === p.job_id);
        const annualSalary = p.annual_salary ?? (job?.salary_max || job?.salary_min || 0);
        const recruiToCost = p.total_fee
            ?? (job?.client_fee_amount != null ? Number(job.client_fee_amount) : null)
            ?? Math.round(annualSalary * (p.fee_percentage ?? job?.fee_percentage ?? 15) / 100);
        const traditionalCost = Math.round(annualSalary * TRADITIONAL_PCT / 100);
        const saving = traditionalCost - recruiToCost;
        const savingPct = traditionalCost > 0 ? Math.round((saving / traditionalCost) * 100) : 0;
        return {
            jobId: p.job_id,
            jobTitle: job?.title ?? "",
            currency: p.salary_currency ?? job?.salary_currency ?? "SEK",
            annualSalary,
            recruiToCost,
            traditionalCost,
            saving,
            savingPct,
        };
    });

    const totalSaving = costs.reduce((a, c) => a + c.saving, 0);
    const totalRecruiTo = costs.reduce((a, c) => a + c.recruiToCost, 0);

    // ── D) RECRUITER PERFORMANCE ─────────────────────────────────────────────
    const recruiterMap: Record<string, {
        recruiterId: string;
        name: string;
        jobCount: number;
        candidateCount: number;
        hiredCount: number;
        avgAiScore: number | null;
        avgDaysToFirstCandidate: number | null;
        scores: number[];
        daysList: number[];
    }> = {};

    for (const mandate of (mandates ?? [])) {
        const rec = Array.isArray(mandate.recruiter) ? mandate.recruiter[0] : mandate.recruiter;
        const profile = Array.isArray(rec?.profile) ? rec?.profile[0] : rec?.profile;
        const name = profile?.full_name ?? "Unknown";
        const rid = mandate.recruiter_id;

        if (!recruiterMap[rid]) {
            recruiterMap[rid] = {
                recruiterId: rid,
                name,
                jobCount: 0,
                candidateCount: 0,
                hiredCount: 0,
                avgAiScore: null,
                avgDaysToFirstCandidate: null,
                scores: [],
                daysList: [],
            };
        }
        recruiterMap[rid].jobCount++;

        const mandateCandidates = (candidates ?? []).filter((c) => c.recruiter_id === rid);
        recruiterMap[rid].candidateCount += mandateCandidates.length;
        recruiterMap[rid].hiredCount += mandateCandidates.filter((c) => HIRED_STATUSES.has(c.status)).length;

        for (const c of mandateCandidates) {
            if (c.ai_match_score != null) recruiterMap[rid].scores.push(c.ai_match_score);
            const job = jobs.find((j) => j.id === c.job_id);
            const days = daysBetween(mandate.created_at, c.submitted_at);
            if (days != null && days >= 0) recruiterMap[rid].daysList.push(days);
        }
    }

    const recruiterPerf = Object.values(recruiterMap).map((r) => ({
        ...r,
        avgAiScore: r.scores.length > 0 ? Math.round(r.scores.reduce((a, b) => a + b, 0) / r.scores.length) : null,
        avgDaysToFirstCandidate: r.daysList.length > 0 ? Math.round(r.daysList.reduce((a, b) => a + b, 0) / r.daysList.length) : null,
        conversionRate: r.candidateCount > 0 ? Math.round((r.hiredCount / r.candidateCount) * 100) : 0,
        scores: undefined,
        daysList: undefined,
    }));

    // ── SUMMARY ──────────────────────────────────────────────────────────────
    const totalCandidates = (candidates ?? []).length;
    const totalHired = (candidates ?? []).filter((c) => HIRED_STATUSES.has(c.status)).length;
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((j) => j.status === "active").length;

    return NextResponse.json({
        funnel,
        timings,
        costs,
        recruiterPerf,
        summary: {
            totalJobs,
            activeJobs,
            totalCandidates,
            totalHired,
            avgDaysToHire,
            avgDaysToInterview,
            totalSaving,
            totalRecruiTo,
            currency: jobs[0]?.salary_currency ?? "SEK",
        },
    });
}
