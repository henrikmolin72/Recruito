"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/require-admin";

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return value ?? null;
}

export async function getAdminStats() {
    const { supabase } = await requireAdmin();

    const [companies, recruiters, jobs, placements, pendingRecruiters, candidates, approvedRecruiters] = await Promise.all([
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("recruiters").select("*", { count: "exact", head: true }),
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("placements").select("total_fee,platform_fee,recruiter_fee,status").limit(1000),
        supabase.from("recruiters").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("candidates").select("*", { count: "exact", head: true }),
        supabase.from("recruiters").select("*", { count: "exact", head: true }).eq("approval_status", "approved"),
    ]);

    const totalRevenue = placements.data?.reduce((sum, placement) => {
        const totalFee = placement.total_fee || 0;
        const recruiterFee = placement.recruiter_fee || 0;
        const platformFee = placement.platform_fee ?? (totalFee > 0 ? Math.max(totalFee - recruiterFee, 0) : 0);
        return sum + platformFee;
    }, 0) || 0;

    const completedPlacements = placements.data?.filter(p => p.status === "completed").length || 0;
    const totalPlacements = placements.data?.length || 0;
    const placementSuccessRate = totalPlacements > 0 ? (completedPlacements / totalPlacements) * 100 : 0;

    return {
        companies: companies.count || 0,
        recruiters: recruiters.count || 0,
        approvedRecruiters: approvedRecruiters.count || 0,
        activeJobs: jobs.count || 0,
        pendingRecruiters: pendingRecruiters.count || 0,
        totalCandidates: candidates.count || 0,
        totalPlacements: totalPlacements,
        completedPlacements: completedPlacements,
        placementSuccessRate: placementSuccessRate,
        totalRevenue,
    };
}

export async function getAdminRecruiters() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    // Get all recruiters first (without joins that may filter)
    const { data: recruiters, error } = await supabaseAdmin
        .from("recruiters")
        .select(`
            id,
            user_id,
            headline,
            approval_status,
            rating,
            total_placements,
            years_experience,
            created_at
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching recruiters:", error);
        return [];
    }

    // Fetch profiles separately to avoid FK join issues
    const userIds = (recruiters || []).map(r => r.user_id).filter(Boolean);
    const profilesRes = userIds.length > 0
        ? await supabaseAdmin.from("profiles").select("id, full_name, email, phone").in("id", userIds)
        : { data: [] };

    const profilesMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]));

    return (recruiters || []).map((r: any) => {
        const profile = profilesMap[r.user_id];
        return {
            id: r.id,
            user_id: r.user_id,
            name: profile?.full_name || "Unknown",
            email: profile?.email || "",
            headline: r.headline || "",
            status: r.approval_status || "pending",
            rating: r.rating || 0,
            placements: r.total_placements || 0,
            years_experience: r.years_experience || 0,
        };
    });
}

export async function approveRecruiter(recruiterId: string) {
    const { user } = await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update({
            approval_status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: user.id,
        })
        .eq("id", recruiterId);

    if (error) return { error: error.message };

    revalidatePath("/admin");
    revalidatePath("/admin/recruiters");
    revalidatePath("/recruiter");
    revalidatePath("/recruiter/jobs");
    revalidatePath("/recruiter/profile");
    return { success: true };
}

export async function rejectRecruiter(recruiterId: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update({
            approval_status: "rejected",
            approved_at: null,
            approved_by: null,
        })
        .eq("id", recruiterId);

    if (error) return { error: error.message };

    revalidatePath("/admin");
    revalidatePath("/admin/recruiters");
    revalidatePath("/recruiter/profile");
    return { success: true };
}

export async function suspendRecruiter(recruiterId: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update({
            approval_status: "suspended",
            approved_at: null,
            approved_by: null,
        })
        .eq("id", recruiterId);

    if (error) return { error: error.message };

    revalidatePath("/admin/recruiters");
    revalidatePath("/recruiter/profile");
    revalidatePath("/recruiter/jobs");
    return { success: true };
}

export async function getAdminCompanies() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
        .from("companies")
        .select(`
            id,
            company_name,
            org_number,
            industry,
            profile:profiles!companies_user_id_fkey (
                full_name,
                email
            ),
            jobs:jobs (count)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching companies:", error);
        return [];
    }

    return (data || []).map((company: any) => {
        const profile = pickFirst(company.profile);
        return {
            id: company.id,
            name: company.company_name || "Okänt företag",
            org_number: company.org_number || "",
            industry: company.industry || "",
            contact: profile?.full_name || "",
            email: profile?.email || "",
            jobs: company.jobs?.[0]?.count || 0,
        };
    });
}

export async function getAdminJobs() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
        .from("jobs")
        .select(`
            id,
            title,
            location,
            salary_min,
            salary_max,
            salary_currency,
            fee_percentage,
            recruiter_fee_percentage,
            status,
            current_recruiter_count,
            max_recruiters,
            company:companies (company_name),
            candidates:candidates (count)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching jobs:", error);
        return [];
    }

    return (data || []).map((job: any) => {
        const company = pickFirst(job.company);
        return {
            id: job.id,
            title: job.title,
            company: company?.company_name || "Okänt",
            location: job.location || "",
            salary: job.salary_max || job.salary_min,
            salaryCurrency: job.salary_currency || "EUR",
            feePercentage: job.fee_percentage,
            recruiterFeePercentage: job.recruiter_fee_percentage ?? 7,
            status: job.status,
            recruiters: job.current_recruiter_count || 0,
            maxRecruiters: job.max_recruiters || 5,
            candidates: job.candidates?.[0]?.count || 0,
        };
    });
}

export async function getAdminPlacements() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
        .from("placements")
        .select(`
            id,
            total_fee,
            platform_fee,
            recruiter_fee,
            status,
            candidate_id,
            job_id,
            company_id,
            recruiter_id,
            start_date,
            guarantee_end_date,
            invoice_sent_at,
            payment_received_at,
            created_at
        `)
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching placements:", error);
        return [];
    }

    // Fetch related data in parallel
    const placementIds = (data || []).map(p => p.id);
    if (placementIds.length === 0) return [];

    const [candidatesRes, jobsRes, companiesRes, recruitersRes] = await Promise.all([
        supabaseAdmin.from("candidates").select("id, first_name, last_name").in("id", (data || []).map(p => p.candidate_id).filter(Boolean)),
        supabaseAdmin.from("jobs").select("id, title").in("id", (data || []).map(p => p.job_id).filter(Boolean)),
        supabaseAdmin.from("companies").select("id, company_name").in("id", (data || []).map(p => p.company_id).filter(Boolean)),
        supabaseAdmin.from("recruiters").select("id, user_id").in("id", (data || []).map(p => p.recruiter_id).filter(Boolean)),
    ]);

    const recruiterIds = recruitersRes.data?.map(r => r.user_id).filter(Boolean) || [];
    const profilesRes = recruiterIds.length > 0
        ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", recruiterIds)
        : { data: [] };

    const candidatesMap = Object.fromEntries((candidatesRes.data || []).map(c => [c.id, c]));
    const jobsMap = Object.fromEntries((jobsRes.data || []).map(j => [j.id, j]));
    const companiesMap = Object.fromEntries((companiesRes.data || []).map(c => [c.id, c]));
    const profilesMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]));
    const recruitersMap = Object.fromEntries((recruitersRes.data || []).map(r => [r.id, { user_id: r.user_id, profile: profilesMap[r.user_id] }]));

    return (data || []).map((placement: any) => {
        const candidate = candidatesMap[placement.candidate_id];
        const job = jobsMap[placement.job_id];
        const company = companiesMap[placement.company_id];
        const recruiter = recruitersMap[placement.recruiter_id];
        const totalFee = placement.total_fee || ((placement.platform_fee || 0) + (placement.recruiter_fee || 0));

        return {
            id: placement.id,
            job: job?.title || "Unknown",
            company: company?.company_name || "Unknown",
            recruiter: recruiter?.profile?.full_name || "Unknown",
            candidate: candidate ? `${candidate.first_name} ${candidate.last_name}` : "Unknown",
            totalFee,
            platformFee: placement.platform_fee ?? Math.max(totalFee - (placement.recruiter_fee || 0), 0),
            recruiterFee: placement.recruiter_fee ?? Math.max(totalFee - (placement.platform_fee || 0), 0),
            status: placement.status,
            date: placement.created_at,
            guaranteeEndDate: placement.guarantee_end_date,
            invoiceSentAt: placement.invoice_sent_at,
            paymentReceivedAt: placement.payment_received_at,
        };
    });
}

export async function getPendingRecruiters() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
        .from("recruiters")
        .select(`
            id,
            headline,
            years_experience,
            created_at,
            profile:profiles!recruiters_user_id_fkey (
                full_name,
                email
            )
        `)
        .eq("approval_status", "pending")
        .order("created_at", { ascending: true });

    if (error) return [];

    return (data || []).map((r: any) => {
        const profile = pickFirst(r.profile);
        return {
            id: r.id,
            name: profile?.full_name || "Okänd",
            email: profile?.email || "",
            headline: r.headline || "",
            years_experience: r.years_experience || 0,
            applied: r.created_at,
        };
    });
}

// ===== NEW ANALYTICS FUNCTIONS =====

function getDateRange(timeRange: string): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date();

    switch (timeRange) {
        case "30d":
            from.setDate(from.getDate() - 30);
            break;
        case "90d":
            from.setDate(from.getDate() - 90);
            break;
        case "ytd":
            from.setFullYear(from.getFullYear(), 0, 1);
            break;
        default:
            from.setFullYear(2000, 0, 1); // All time
    }

    return { from, to };
}

export async function getRecruiterAnalytics(timeRange: string = "90d") {
    const { supabase } = await requireAdmin();
    const { from, to } = getDateRange(timeRange);

    // Get all recruiter counts and statuses
    const recruiterCountRes = await supabase.from("recruiters").select("approval_status", { count: "exact" });

    // Get ALL approved recruiters with their performance data
    const allRecruitersRes = await supabase
        .from("recruiters")
        .select(`
            id,
            perf_hire_rate,
            perf_avg_time_to_hire_days,
            perf_candidates_submitted,
            perf_candidates_hired,
            perf_guarantee_success_rate,
            user_id,
            created_at
        `)
        .eq("approval_status", "approved")
        .order("perf_hire_rate", { ascending: false });

    // Get performance metrics for averages
    const metricsRes = await supabase
        .from("recruiters")
        .select("perf_hire_rate, perf_avg_time_to_hire_days, perf_guarantee_success_rate")
        .eq("approval_status", "approved");

    // Get profile information for all recruiters
    const recruiterIds = allRecruitersRes.data?.map(r => r.user_id).filter(Boolean) || [];
    const profilesRes = recruiterIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", recruiterIds)
        : { data: [] };

    // Get earnings for each recruiter
    const placementsRes = await supabase
        .from("placements")
        .select("recruiter_id, total_fee");

    const profilesMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p.full_name]));
    const earningsMap: Record<string, number> = {};
    (placementsRes.data || []).forEach((p: any) => {
        earningsMap[p.recruiter_id] = (earningsMap[p.recruiter_id] || 0) + (p.total_fee || 0);
    });

    const totalRecruiters = recruiterCountRes.data?.reduce((acc, r: any) => {
        if (r.approval_status === "approved") acc.approved++;
        if (r.approval_status === "pending") acc.pending++;
        return acc;
    }, { approved: 0, pending: 0 });

    const metrics = metricsRes.data || [];
    const avgHireRate = metrics.length > 0 ? metrics.reduce((sum: number, m: any) => sum + (m.perf_hire_rate || 0), 0) / metrics.length : 0;
    const avgTimeToHire = metrics.length > 0 ? metrics.reduce((sum: number, m: any) => sum + (m.perf_avg_time_to_hire_days || 0), 0) / metrics.length : 0;
    const avgGuaranteeRate = metrics.length > 0 ? metrics.reduce((sum: number, m: any) => sum + (m.perf_guarantee_success_rate || 0), 0) / metrics.length : 0;

    return {
        counts: {
            total: recruiterCountRes.count || 0,
            ...totalRecruiters,
        },
        averages: {
            hireRate: avgHireRate,
            timeToHire: avgTimeToHire,
            guaranteeSuccessRate: avgGuaranteeRate,
        },
        topRecruiters: (allRecruitersRes.data || []).map((r: any) => ({
            id: r.id,
            name: profilesMap[r.user_id] || "Unknown",
            hireRate: r.perf_hire_rate || 0,
            timeToHire: r.perf_avg_time_to_hire_days || 0,
            submitted: r.perf_candidates_submitted || 0,
            hired: r.perf_candidates_hired || 0,
            earnings: earningsMap[r.id] || 0,
        })),
    };
}

export async function getJobAnalytics(timeRange: string = "90d") {
    const { supabase } = await requireAdmin();
    const { from, to } = getDateRange(timeRange);

    const [jobStats, jobsByStatus, jobsByIndustry] = await Promise.all([
        supabase
            .from("jobs")
            .select("status, industry, current_recruiter_count, guarantee_period_months, created_at")
            .gte("created_at", from.toISOString())
            .lte("created_at", to.toISOString()),
        supabase.from("jobs").select("status", { count: "exact" }),
        supabase
            .from("jobs")
            .select("industry, id")
            .gte("created_at", from.toISOString())
            .lte("created_at", to.toISOString()),
    ]);

    const jobs = jobStats.data || [];
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((j: any) => j.status === "active").length;
    const filledJobs = jobs.filter((j: any) => j.status === "closed").length;

    const statusBreakdown: Record<string, number> = {};
    (jobsByStatus.data || []).forEach((j: any) => {
        statusBreakdown[j.status] = (statusBreakdown[j.status] || 0) + 1;
    });

    return {
        stats: {
            total: totalJobs,
            active: activeJobs,
            filled: filledJobs,
            fillRate: totalJobs > 0 ? (filledJobs / totalJobs) * 100 : 0,
        },
        byStatus: statusBreakdown,
        byIndustry: Object.entries(
            (jobsByIndustry.data || []).reduce((acc: Record<string, number>, j: any) => {
                acc[j.industry || "Other"] = (acc[j.industry || "Other"] || 0) + 1;
                return acc;
            }, {})
        ).map(([industry, count]) => ({ industry, count })),
    };
}

export async function getCandidateAnalytics(timeRange: string = "90d") {
    const { supabase } = await requireAdmin();
    const { from, to } = getDateRange(timeRange);

    const [candidatesByStage, stageMetrics] = await Promise.all([
        supabase
            .from("candidates")
            .select("status", { count: "exact" })
            .gte("created_at", from.toISOString())
            .lte("created_at", to.toISOString()),
        supabase
            .from("candidates")
            .select("status, created_at, hired_at, submitted_at")
            .gte("created_at", from.toISOString())
            .lte("created_at", to.toISOString()),
    ]);

    const candidates = stageMetrics.data || [];
    const hiredCandidates = candidates.filter((c: any) => c.status === "hired").length;
    const submittedCandidates = candidates.filter((c: any) => c.status === "submitted").length;

    const conversionRate = submittedCandidates > 0 ? (hiredCandidates / submittedCandidates) * 100 : 0;

    const stageBreakdown: Record<string, { count: number; avgDays: number }> = {};
    const stages = ["submitted", "reviewing", "interview", "offered", "hired", "rejected"];

    stages.forEach((stage) => {
        const stageData = candidates.filter((c: any) => c.status === stage);
        const count = stageData.length;

        const avgDays =
            count > 0
                ? stageData.reduce((sum: number, c: any) => {
                    const start = new Date(c.submitted_at || c.created_at);
                    const end = new Date(c.hired_at || new Date());
                    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                    return sum + days;
                }, 0) / count
                : 0;

        stageBreakdown[stage] = { count, avgDays: Math.round(avgDays) };
    });

    // Calculate avg pipeline duration for hired candidates
    const hiredData = candidates.filter((c: any) => c.status === "hired" && c.hired_at);
    const avgDuration = hiredData.length > 0
        ? hiredData.reduce((sum: number, c: any) => {
            const start = new Date(c.submitted_at || c.created_at);
            const end = new Date(c.hired_at);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / hiredData.length
        : 0;

    // Offer acceptance rate
    const offeredCandidates = candidates.filter((c: any) => c.status === "offered" || c.status === "hired").length;
    const offerAcceptanceRate = offeredCandidates > 0 ? hiredCandidates / offeredCandidates : 0;

    return {
        stats: {
            total: candidates.length,
            hired: hiredCandidates,
            conversionRate: candidates.length > 0 ? hiredCandidates / candidates.length : 0,
            avgDuration,
            offerAcceptanceRate,
        },
        byStage: stages.map((stage) => {
            const s = stageBreakdown[stage];
            const nextStageIdx = stages.indexOf(stage) + 1;
            const nextStage = nextStageIdx < stages.length ? stages[nextStageIdx] : null;
            const nextCount = nextStage ? stageBreakdown[nextStage]?.count || 0 : 0;
            return {
                stage,
                count: s.count,
                avgDays: s.avgDays,
                conversionRate: s.count > 0 ? nextCount / s.count : 0,
            };
        }),
    };
}

export async function getCompanyAnalytics(timeRange: string = "90d") {
    const { supabase } = await requireAdmin();
    const { from, to } = getDateRange(timeRange);

    const [companyCounts, allJobs, newCompaniesRes, allCompanies] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact" }),
        supabase
            .from("jobs")
            .select("company_id, status")
            .gte("created_at", from.toISOString())
            .lte("created_at", to.toISOString()),
        supabase
            .from("companies")
            .select("id", { count: "exact" })
            .gte("created_at", from.toISOString())
            .lte("created_at", to.toISOString()),
        supabase
            .from("companies")
            .select("id, company_name, user_id")
            .order("created_at", { ascending: false }),
    ]);

    const totalCompanies = companyCounts.count || 0;
    const jobsInPeriod = allJobs.data || [];

    // Jobs per company
    const jobsByCompany: Record<string, { total: number; active: number; filled: number }> = {};
    jobsInPeriod.forEach((j: any) => {
        if (!jobsByCompany[j.company_id]) {
            jobsByCompany[j.company_id] = { total: 0, active: 0, filled: 0 };
        }
        jobsByCompany[j.company_id].total++;
        if (j.status === "active") jobsByCompany[j.company_id].active++;
        if (j.status === "closed") jobsByCompany[j.company_id].filled++;
    });

    const companiesWithActiveJobs = Object.values(jobsByCompany).filter(c => c.active > 0).length;
    const companiesInPeriod = Object.keys(jobsByCompany).length;
    const avgJobsPerCompany = companiesInPeriod > 0
        ? parseFloat((jobsInPeriod.length / companiesInPeriod).toFixed(1))
        : 0;

    // Build top companies list
    const companiesMap = Object.fromEntries((allCompanies.data || []).map(c => [c.id, c]));
    const topCompanies = Object.entries(jobsByCompany)
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 20)
        .map(([companyId, stats]) => ({
            name: companiesMap[companyId]?.company_name || "Unknown",
            totalJobs: stats.total,
            activeJobs: stats.active,
            filledJobs: stats.filled,
        }));

    return {
        stats: {
            total: totalCompanies,
            newCompanies: newCompaniesRes.count || 0,
            avgJobsPerCompany,
            companiesWithActiveJobs,
        },
        topCompanies,
    };
}

export async function getEarningsAnalytics(timeRange: string = "90d") {
    const { supabase } = await requireAdmin();
    const { from, to } = getDateRange(timeRange);

    const [placementsRes, recruiterPlacementsRes] = await Promise.all([
        supabase
            .from("placements")
            .select("total_fee, platform_fee, recruiter_fee, recruiter_id, created_at, status")
            .gte("created_at", from.toISOString())
            .lte("created_at", to.toISOString()),
        supabase
            .from("recruiters")
            .select("id, user_id"),
    ]);

    const placementData = placementsRes.data || [];
    const totalRevenue = placementData.reduce((sum: number, p: any) => {
        const totalFee = p.total_fee || ((p.platform_fee || 0) + (p.recruiter_fee || 0));
        return sum + (p.platform_fee ?? Math.max(totalFee - (p.recruiter_fee || 0), 0));
    }, 0);

    const recruiterPayouts = placementData.reduce((sum: number, p: any) => sum + (p.recruiter_fee || 0), 0);
    const totalFees = placementData.reduce((sum: number, p: any) => {
        return sum + (p.total_fee || ((p.platform_fee || 0) + (p.recruiter_fee || 0)));
    }, 0);

    // Group by day for trend (with placement count)
    const dailyData: Record<string, { revenue: number; placements: number }> = {};
    placementData.forEach((p: any) => {
        const date = new Date(p.created_at).toISOString().split("T")[0];
        const platformFee = p.platform_fee ?? Math.max((p.total_fee || 0) - (p.recruiter_fee || 0), 0);
        if (!dailyData[date]) dailyData[date] = { revenue: 0, placements: 0 };
        dailyData[date].revenue += platformFee;
        dailyData[date].placements++;
    });

    // Group by recruiter for top sources
    const recruiterRevenue: Record<string, { revenue: number; placements: number }> = {};
    placementData.forEach((p: any) => {
        const rid = p.recruiter_id;
        if (!rid) return;
        if (!recruiterRevenue[rid]) recruiterRevenue[rid] = { revenue: 0, placements: 0 };
        const totalFee = p.total_fee || ((p.platform_fee || 0) + (p.recruiter_fee || 0));
        recruiterRevenue[rid].revenue += totalFee;
        recruiterRevenue[rid].placements++;
    });

    // Get recruiter names
    const recruiterUserIds = (recruiterPlacementsRes.data || []).map(r => r.user_id).filter(Boolean);
    const profilesRes = recruiterUserIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", recruiterUserIds)
        : { data: [] };
    const profilesMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p.full_name]));
    const recruiterUserMap = Object.fromEntries((recruiterPlacementsRes.data || []).map(r => [r.id, r.user_id]));

    const topSources = Object.entries(recruiterRevenue)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(([recruiterId, data]) => ({
            recruiterName: profilesMap[recruiterUserMap[recruiterId]] || "Unknown",
            revenue: Math.round(data.revenue),
            placements: data.placements,
        }));

    const avgFeePerPlacement = placementData.length > 0 ? Math.round(totalFees / placementData.length) : 0;

    return {
        stats: {
            totalRevenue: Math.round(totalRevenue),
            recruiterPayouts: Math.round(recruiterPayouts),
            platformFee: Math.round(totalRevenue - recruiterPayouts),
            avgFeePerPlacement,
        },
        dailyRevenue: Object.entries(dailyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => ({
                date,
                revenue: Math.round(data.revenue),
                placements: data.placements,
            })),
        topSources,
    };
}

// ===== ADMIN NOTIFICATIONS =====

export async function getNotificationRecipients() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    // Get all recruiters
    const { data: recruiters } = await supabaseAdmin
        .from("recruiters")
        .select("id, user_id, approval_status");

    const recruiterUserIds = (recruiters || []).map(r => r.user_id).filter(Boolean);

    // Get all companies
    const { data: companies } = await supabaseAdmin
        .from("companies")
        .select("id, user_id, company_name");

    const companyUserIds = (companies || []).map(c => c.user_id).filter(Boolean);

    // Get profiles for all users
    const allUserIds = [...recruiterUserIds, ...companyUserIds];
    const { data: profiles } = allUserIds.length > 0
        ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", allUserIds)
        : { data: [] };

    const profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    const recruiterList = (recruiters || []).map(r => {
        const profile = profilesMap[r.user_id];
        return {
            id: r.user_id,
            name: profile?.full_name || "Unknown",
            email: profile?.email || "",
            type: "recruiter" as const,
            status: r.approval_status,
        };
    });

    const companyList = (companies || []).map(c => {
        const profile = profilesMap[c.user_id];
        return {
            id: c.user_id,
            name: c.company_name || profile?.full_name || "Unknown",
            email: profile?.email || "",
            type: "company" as const,
        };
    });

    return { recruiters: recruiterList, companies: companyList };
}

export async function sendAdminNotification(formData: {
    title: string;
    body: string;
    link?: string;
    audience: "all" | "all_recruiters" | "all_companies" | "specific";
    recipientIds?: string[];
}) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { title, body, link, audience, recipientIds } = formData;

    if (!title?.trim() || !body?.trim()) {
        return { error: "Title and body are required" };
    }

    let targetUserIds: string[] = [];

    if (audience === "specific" && recipientIds?.length) {
        targetUserIds = recipientIds;
    } else {
        // Fetch user IDs based on audience
        if (audience === "all" || audience === "all_recruiters") {
            const { data: recruiters } = await supabaseAdmin
                .from("recruiters")
                .select("user_id")
                .eq("approval_status", "approved");
            targetUserIds.push(...(recruiters || []).map(r => r.user_id).filter(Boolean));
        }

        if (audience === "all" || audience === "all_companies") {
            const { data: companies } = await supabaseAdmin
                .from("companies")
                .select("user_id");
            targetUserIds.push(...(companies || []).map(c => c.user_id).filter(Boolean));
        }
    }

    if (targetUserIds.length === 0) {
        return { error: "No recipients found" };
    }

    // Insert notifications in batch
    const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        title: title.trim(),
        body: body.trim(),
        link: link?.trim() || null,
    }));

    const { error } = await supabaseAdmin.from("notifications").insert(notifications);

    if (error) {
        console.error("Error sending notifications:", error);
        return { error: "Failed to send notifications" };
    }

    revalidatePath("/admin");
    return { success: true, count: targetUserIds.length };
}

export async function getAdminNotificationHistory() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    // Get recent notifications sent (grouped by title+body+created_at within 1 second)
    const { data, error } = await supabaseAdmin
        .from("notifications")
        .select("id, title, body, link, created_at, is_read, user_id")
        .order("created_at", { ascending: false })
        .limit(200);

    if (error) {
        console.error("Error fetching notification history:", error);
        return [];
    }

    // Group notifications that were sent at the same time (batch sends)
    const grouped: Record<string, { title: string; body: string; link: string | null; created_at: string; recipientCount: number; readCount: number }> = {};

    (data || []).forEach((n: any) => {
        // Group by title + body + timestamp rounded to nearest 5 seconds
        const ts = new Date(n.created_at);
        ts.setSeconds(Math.floor(ts.getSeconds() / 5) * 5);
        ts.setMilliseconds(0);
        const key = `${n.title}|${n.body}|${ts.toISOString()}`;

        if (!grouped[key]) {
            grouped[key] = {
                title: n.title,
                body: n.body,
                link: n.link,
                created_at: n.created_at,
                recipientCount: 0,
                readCount: 0,
            };
        }
        grouped[key].recipientCount++;
        if (n.is_read) grouped[key].readCount++;
    });

    return Object.values(grouped).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export async function updateRecruiterFeePercentage(jobId: string, percentage: number) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    if (percentage < 0 || percentage > 100) return { error: "Invalid percentage" };

    const { error } = await supabaseAdmin
        .from("jobs")
        .update({ recruiter_fee_percentage: percentage })
        .eq("id", jobId);

    if (error) return { error: error.message };

    revalidatePath("/admin/jobs");
    return { success: true };
}

// Step 7 of recruitment process flow: list submitted candidates not yet screened by Recruito.
export async function getCandidatesForScreening() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
        .from("candidates")
        .select(`
            id,
            first_name,
            last_name,
            current_title,
            ai_match_score,
            status,
            created_at,
            recruito_screened_at,
            job:jobs(title, company:companies(company_name)),
            recruiter:recruiters(profile:profiles!recruiters_user_id_fkey(full_name))
        `)
        .order("created_at", { ascending: false })
        .limit(200);

    if (error) {
        console.error("[getCandidatesForScreening]", error);
        return [];
    }

    return (data || []).map((c: any) => {
        const job = pickFirst(c.job);
        const company = job ? pickFirst(job.company) : null;
        const recruiter = pickFirst(c.recruiter);
        const profile = recruiter ? pickFirst(recruiter.profile) : null;
        return {
            id: c.id,
            name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown",
            currentTitle: c.current_title || "",
            aiMatchScore: c.ai_match_score,
            status: c.status,
            createdAt: c.created_at,
            screenedAt: c.recruito_screened_at,
            jobTitle: job?.title || "—",
            companyName: company?.company_name || "—",
            recruiterName: profile?.full_name || "—",
        };
    });
}
