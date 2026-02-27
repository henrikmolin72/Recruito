"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Job, Company } from "@/types/db-types";

import { revalidatePath } from "next/cache";
import { validateCompanyProfileForm } from "@/lib/validation/forms";
import { TIER_WINDOW_MONTHS } from "@/lib/pricing";

// Helper to handle errors or redirect
function handleError(error: any) {
    const normalized = {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        raw: (() => {
            try {
                return JSON.stringify(error);
            } catch {
                return String(error);
            }
        })()
    };
    console.error("Company action error:", normalized);

    if (error?.message === "JWT_EXPIRED") {
        redirect("/login");
    }
    throw new Error("Kunde inte hämta data");
}

export async function getCompanyProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const { data: company } = await supabase.from("companies").select("*").eq("user_id", user.id).single();

    return { profile, company };
}

export async function updateCompanyProfile(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Ej inloggad" };

    const parsed = validateCompanyProfileForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    // Update company
    const { error: companyError } = await supabase
        .from("companies")
        .update({
            company_name: parsed.data.company_name,
            org_number: parsed.data.org_number,
            description: parsed.data.description,
            city: parsed.data.city,
            industry: parsed.data.industry,
            website: parsed.data.website,
            billing_email: parsed.data.contact_email,
        })
        .eq("user_id", user.id);

    if (companyError) return { error: companyError.message };

    // Update profile name
    if (parsed.data.contact_name) {
        await supabase.from("profiles").update({ full_name: parsed.data.contact_name }).eq("id", user.id);
    }

    revalidatePath("/company/profile");
    return { success: true };
}

export async function getCompanyDashboard() {
    const supabase = await createClient();

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // 2. Get company profile
    const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .single();

    if (companyError || !company) {
        console.error("No company profile found:", companyError);
        // If user has role company but no profile, maybe redirect to onboarding?
        return {
            company: { company_name: user.user_metadata.full_name || "Mitt Företag" } as Company,
            jobs: [],
            stats: { activeJobs: 0, candidates: 0, interviews: 0, placements: 0, recentPlacements: 0 },
            recentActivity: []
        };
    }

    // 3. Get jobs for this company
    const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

    if (jobsError) {
        handleError(jobsError);
    }

    const jobIds = jobs?.map(j => j.id) || [];

    // 4. Calculate stats
    // For candidates count, we need a separate query or join.
    // The above join gives counts per job.

    // Let's get total candidates across all jobs
    const { count: totalCandidates } = jobIds.length > 0
        ? await supabase
            .from("candidates")
            .select("*", { count: 'exact', head: true })
            .in("job_id", jobIds)
        : { count: 0 };

    const { count: activeInterviews } = jobIds.length > 0
        ? await supabase
            .from("candidates")
            .select("*", { count: 'exact', head: true })
            .in("job_id", jobIds)
            .eq("status", "interview")
        : { count: 0 };

    const { data: candidateJobRows, error: candidateJobRowsError } = jobIds.length > 0
        ? await supabase
            .from("candidates")
            .select("job_id")
            .in("job_id", jobIds)
        : { data: [], error: null as any };

    if (candidateJobRowsError) {
        handleError(candidateJobRowsError);
    }

    const candidatesCountByJob: Record<string, number> = {};
    (candidateJobRows || []).forEach((row: any) => {
        if (!row?.job_id) return;
        candidatesCountByJob[row.job_id] = (candidatesCountByJob[row.job_id] || 0) + 1;
    });

    const { count: successfulPlacements } = await supabase
        .from("placements")
        .select("*", { count: 'exact', head: true })
        .eq("company_id", company.id);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - TIER_WINDOW_MONTHS);

    const { count: recentPlacements } = await supabase
        .from("placements")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .gte("created_at", twelveMonthsAgo.toISOString());

    const activeJobsCount = jobs?.filter(j => j.status === 'active').length || 0;

    // Transform jobs for display
    const jobsFormatted = jobs?.map((job) => ({
        ...job,
        candidates_count: candidatesCountByJob[job.id] || 0,
        recruiters_count: job.current_recruiter_count || 0,
    })) || [];

    return {
        company: company as Company,
        jobs: jobsFormatted,
        stats: {
            activeJobs: activeJobsCount,
            candidates: totalCandidates || 0,
            interviews: activeInterviews || 0,
            placements: successfulPlacements || 0,
            recentPlacements: recentPlacements ?? 0,
        },
        // We don't have activity log yet populated, return empty or mock
        recentActivity: []
    };
}

export async function getCompanyPlacementCountRecent(): Promise<number> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!company) return 0;

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - TIER_WINDOW_MONTHS);

    const { count } = await supabase
        .from("placements")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .gte("created_at", twelveMonthsAgo.toISOString());

    return count ?? 0;
}

export async function getCompanyAnalytics() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!company) return null;

    // 1. Get all jobs
    const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, status, created_at")
        .eq("company_id", company.id);

    const jobIds = jobs?.map(j => j.id) || [];
    if (jobIds.length === 0) {
        return {
            funnel: { submitted: 0, reviewing: 0, interview: 0, offered: 0, hired: 0, rejected: 0 },
            timeToHire: { average: 0, fastest: 0, slowest: 0, byJob: [] },
            costPerHire: { average: 0, total: 0, byJob: [] },
            overview: { totalJobs: 0, activeJobs: 0, totalCandidates: 0, totalPlacements: 0, fillRate: 0 },
        };
    }

    // 2. Get all candidates across jobs for funnel
    const { data: candidates } = await supabase
        .from("candidates")
        .select("id, job_id, status, submitted_at, created_at")
        .in("job_id", jobIds);

    const allCandidates = candidates || [];

    // Funnel stages
    const funnelStages = {
        submitted: 0,
        reviewing: 0,
        interview: 0,
        offered: 0,
        hired: 0,
        rejected: 0,
    };

    const interviewStatuses = ["interview", "interview_stage_1", "interview_stage_2", "interview_stage_3", "final_interview"];
    const rejectStatuses = ["rejected", "rejected_client", "rejected_interview", "declined", "offer_declined", "candidate_withdrawn"];
    const offerStatuses = ["offered", "offer_in_progress", "offer_accepted"];
    const hiredStatuses = ["hired", "invoice_enabled", "guarantee_tracking", "guarantee_period", "completed"];

    for (const c of allCandidates) {
        if (hiredStatuses.includes(c.status)) {
            funnelStages.hired++;
        } else if (offerStatuses.includes(c.status)) {
            funnelStages.offered++;
        } else if (interviewStatuses.includes(c.status)) {
            funnelStages.interview++;
        } else if (rejectStatuses.includes(c.status)) {
            funnelStages.rejected++;
        } else if (["reviewing", "under_client_review", "info_requested", "resubmitted"].includes(c.status)) {
            funnelStages.reviewing++;
        } else {
            funnelStages.submitted++;
        }
    }

    // 3. Time-to-hire: from job creation to candidate hired
    const { data: placements } = await supabase
        .from("placements")
        .select("id, job_id, created_at, total_fee, platform_fee, recruiter_fee")
        .eq("company_id", company.id);

    const allPlacements = placements || [];

    const jobMap = new Map((jobs || []).map(j => [j.id, j]));
    const timeToHireByJob: { jobTitle: string; days: number }[] = [];

    for (const p of allPlacements) {
        const job = jobMap.get(p.job_id);
        if (job) {
            const jobCreated = new Date(job.created_at);
            const placementCreated = new Date(p.created_at);
            const diffMs = placementCreated.getTime() - jobCreated.getTime();
            const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
            timeToHireByJob.push({ jobTitle: job.title, days: diffDays });
        }
    }

    const tthDays = timeToHireByJob.map(t => t.days);
    const avgTimeToHire = tthDays.length > 0 ? Math.round(tthDays.reduce((a, b) => a + b, 0) / tthDays.length) : 0;
    const fastestHire = tthDays.length > 0 ? Math.min(...tthDays) : 0;
    const slowestHire = tthDays.length > 0 ? Math.max(...tthDays) : 0;

    // 4. Cost-per-hire
    const costByJob: { jobTitle: string; cost: number }[] = [];
    for (const p of allPlacements) {
        const job = jobMap.get(p.job_id);
        if (job) {
            costByJob.push({ jobTitle: job.title, cost: p.total_fee || 0 });
        }
    }

    const totalCost = costByJob.reduce((sum, c) => sum + c.cost, 0);
    const avgCostPerHire = costByJob.length > 0 ? Math.round(totalCost / costByJob.length) : 0;

    // 5. Overview
    const activeJobs = (jobs || []).filter(j => j.status === "active").length;
    const fillRate = (jobs || []).length > 0
        ? Math.round((allPlacements.length / (jobs || []).length) * 100)
        : 0;

    return {
        funnel: funnelStages,
        timeToHire: {
            average: avgTimeToHire,
            fastest: fastestHire,
            slowest: slowestHire,
            byJob: timeToHireByJob.slice(0, 10),
        },
        costPerHire: {
            average: avgCostPerHire,
            total: totalCost,
            byJob: costByJob.slice(0, 10),
        },
        overview: {
            totalJobs: (jobs || []).length,
            activeJobs,
            totalCandidates: allCandidates.length,
            totalPlacements: allPlacements.length,
            fillRate,
        },
    };
}
