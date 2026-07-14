"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/require-admin";
import { isValidUpliftReason, reasonI18nKey } from "@/lib/fee-reconfirm";
import { feeReconfirmEmail } from "@/lib/email/email-templates";
import { sendUserEmail } from "@/lib/email/internal-notifications";
import { createNotification } from "@/lib/notifications/create";
import { getDictionary } from "@/i18n/server";
import { countRecruiterCandidateBuckets, countCompanyCandidateBuckets, countCandidatesAgainstCap } from "@/lib/candidate-workflow";
import { averageGuaranteeRate } from "@/lib/recruiter-metrics";
import type { ClientFeeUpliftReason } from "@/types/db-types";

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
        supabase.from("placements").select("status, jobs(client_fee_amount, recruiter_fee_amount)").limit(1000),
        supabase.from("recruiters").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
        // Only presented candidates — exclude drafts (mirrors isCandidateSubmitted: status !== "draft").
        supabase.from("candidates").select("*", { count: "exact", head: true }).neq("status", "draft"),
        supabase.from("recruiters").select("*", { count: "exact", head: true }).eq("approval_status", "approved"),
    ]);

    // Revenue rides on the full placements set; a silent query error or the 1000-row cap
    // would understate a money figure shown to admins. Make either condition loud rather
    // than render a wrong total. ponytail: 1000-row cap — move revenue to a SQL sum if this fires.
    if (placements.error) {
        console.error("[getAdminStats] placements query failed; revenue may be understated:", placements.error.message);
    } else if (placements.data?.length === 1000) {
        console.warn("[getAdminStats] placements hit the 1000-row cap — revenue/placement stats truncate here.");
    }

    // Platform revenue = Σ over placements of (client fee − recruiter fee), using the job's
    // admin-negotiated fees. The placement's own total_fee/recruiter_fee are stale seed
    // snapshots (15%-of-salary) and must not be used here.
    const totalRevenue = placements.data?.reduce((sum, placement) => {
        const job = pickFirst(placement.jobs);
        const clientFee = Number(job?.client_fee_amount ?? 0);
        const recruiterFee = Number(job?.recruiter_fee_amount ?? 0);
        return sum + Math.max(clientFee - recruiterFee, 0);
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

    // Active + rejected candidate counts per recruiter. One indexed query over
    // (recruiter_id, status) for all listed recruiters, then bucket in memory via
    // the canonical workflow predicates — no per-recruiter N+1, no status strings here.
    const recruiterIds = (recruiters || []).map(r => r.id);
    const candidatesRes = recruiterIds.length > 0
        ? await supabaseAdmin.from("candidates").select("recruiter_id, status").in("recruiter_id", recruiterIds)
        : { data: [] };
    const statusesByRecruiter: Record<string, (string | null)[]> = {};
    for (const c of (candidatesRes.data || []) as Array<{ recruiter_id: string; status: string | null }>) {
        (statusesByRecruiter[c.recruiter_id] ??= []).push(c.status);
    }

    return (recruiters || []).map((r: any) => {
        const profile = profilesMap[r.user_id];
        const { active, rejected } = countRecruiterCandidateBuckets(statusesByRecruiter[r.id] || []);
        return {
            id: r.id,
            user_id: r.user_id,
            name: profile?.full_name || "Unknown",
            email: profile?.email || "",
            headline: r.headline || "",
            status: r.approval_status || "pending",
            rating: r.rating || 0,
            placements: r.total_placements || 0,
            activeCandidates: active,
            rejectedCandidates: rejected,
            years_experience: r.years_experience || 0,
            joinedAt: r.created_at,
        };
    });
}

// KYC criteria the admin must confirm before approving a recruiter. All four
// required true. The `notes` field is optional free text. Keep in sync with
// the UI checkboxes in recruiter-approval-actions.tsx.
export type RecruiterKycChecklist = {
    linkedin_verified: boolean;
    email_domain_match: boolean;
    experience_credible: boolean;
    agreement_signed: boolean;
    notes?: string;
};

const REQUIRED_KYC_KEYS = [
    "linkedin_verified",
    "email_domain_match",
    "experience_credible",
    "agreement_signed",
] as const;

function isKycComplete(input: unknown): input is RecruiterKycChecklist {
    if (!input || typeof input !== "object") return false;
    const c = input as Record<string, unknown>;
    return REQUIRED_KYC_KEYS.every((key) => c[key] === true);
}

export async function approveRecruiter(
    recruiterId: string,
    checklist: RecruiterKycChecklist,
) {
    const { user } = await requireAdmin();
    const supabaseAdmin = createAdminClient();

    if (!isKycComplete(checklist)) {
        return { error: "KYC-checklistan måste bekräftas i sin helhet innan rekryteraren kan godkännas." };
    }

    const storedChecklist: RecruiterKycChecklist = {
        linkedin_verified: true,
        email_domain_match: true,
        experience_credible: true,
        agreement_signed: true,
        notes: checklist.notes?.trim().slice(0, 2000) || undefined,
    };

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update({
            approval_status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: user.id,
            kyc_checklist: storedChecklist,
            kyc_rejection_reason: null,
        })
        .eq("id", recruiterId);

    if (error) {
        console.error("[approveRecruiter]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/recruiters");
    revalidatePath(`/admin/recruiters/${recruiterId}`);
    revalidatePath("/recruiter");
    revalidatePath("/recruiter/jobs");
    revalidatePath("/recruiter/profile");
    return { success: true };
}

// Approve a company so it can access the platform. Companies register as
// 'pending' and are blocked from the dashboard until an admin approves them.
export async function approveCompany(companyId: string) {
    const { user } = await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin
        .from("companies")
        .update({
            approval_status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: user.id,
        })
        .eq("id", companyId);

    if (error) {
        console.error("[approveCompany]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${companyId}`);
    revalidatePath("/company");
    return { success: true };
}

// Re-activate a previously suspended or rejected recruiter without re-running
// full KYC — admin's decision is the audit signal (approved_at/approved_by
// timestamps update). For a fresh KYC pass, call approveRecruiter with a
// new checklist instead.
export async function reactivateRecruiter(recruiterId: string) {
    const { user } = await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update({
            approval_status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: user.id,
            kyc_rejection_reason: null,
        })
        .eq("id", recruiterId);

    if (error) {
        console.error("[reactivateRecruiter]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/recruiters");
    revalidatePath(`/admin/recruiters/${recruiterId}`);
    return { success: true };
}

export async function rejectRecruiter(recruiterId: string, reason: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const trimmedReason = (reason || "").trim().slice(0, 1000);
    if (!trimmedReason) {
        return { error: "Anledning krävs för att avslå rekryterare." };
    }

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update({
            approval_status: "rejected",
            approved_at: null,
            approved_by: null,
            kyc_rejection_reason: trimmedReason,
        })
        .eq("id", recruiterId);

    if (error) {
        console.error("[rejectRecruiter]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/recruiters");
    revalidatePath(`/admin/recruiters/${recruiterId}`);
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

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    revalidatePath("/admin/recruiters");
    revalidatePath("/recruiter/profile");
    revalidatePath("/recruiter/jobs");
    return { success: true };
}

export async function getAdminCompanies() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    // Embed jobs + their candidate statuses so the candidate funnel columns can be
    // bucketed in JS via the canonical candidate-workflow predicates. Selecting only
    // status keeps the payload lean; revisit with a DB-side aggregate if a company
    // ever accumulates very large candidate volumes.
    const { data, error } = await supabaseAdmin
        .from("companies")
        .select(`
            id,
            company_name,
            org_number,
            industry,
            created_at,
            approval_status,
            profile:profiles!companies_user_id_fkey (
                full_name,
                email
            ),
            jobs:jobs (
                id,
                status,
                candidates:candidates ( status )
            ),
            placements:placements (count)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching companies:", error);
        return [];
    }

    return (data || []).map((company: any) => {
        const profile = pickFirst(company.profile);
        const jobsArr = Array.isArray(company.jobs) ? company.jobs : [];
        const statuses = jobsArr.flatMap((j: any) =>
            (Array.isArray(j.candidates) ? j.candidates : []).map((c: any) => c.status),
        );
        const { submitted, inInterview, rejected } = countCompanyCandidateBuckets(statuses);
        return {
            id: company.id,
            name: company.company_name || "Okänt företag",
            org_number: company.org_number || "",
            industry: company.industry || "",
            contact: profile?.full_name || "",
            email: profile?.email || "",
            // "Active jobs" column = live mandates only (status 'active'); paused,
            // draft, closed and filled jobs are excluded, matching the company
            // dashboard's own Active-jobs metric (company.ts getCompanyDashboard).
            jobs: jobsArr.filter((j: any) => j.status === "active").length,
            hired: company.placements?.[0]?.count || 0,
            candidatesSubmitted: submitted,
            inInterview,
            rejectedCandidates: rejected,
            approvalStatus: company.approval_status || "approved",
            joinedAt: company.created_at,
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
            city,
            location,
            country,
            salary_min,
            salary_max,
            salary_currency,
            fee_percentage,
            recruiter_fee_percentage,
            client_fee_amount,
            recruiter_fee_amount,
            client_fee_amount_estimated,
            client_fee_amount_proposed,
            client_fee_uplift_reason,
            client_fee_uplift_note,
            client_fee_reconfirm_requested_at,
            client_fee_reconfirm_resolved_at,
            client_fee_reconfirm_decision,
            changes_requested_at,
            resubmitted_at,
            is_exclusive,
            guarantee_period_months,
            status,
            current_recruiter_count,
            max_recruiters,
            max_candidates,
            created_at,
            company:companies (company_name),
            candidates:candidates ( status )
        `)
        .neq("status", "draft")
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
            city: job.city ?? null,
            country: job.country ?? null,
            salary: job.salary_max || job.salary_min,
            salaryCurrency: job.salary_currency || "EUR",
            feePercentage: job.fee_percentage,
            recruiterFeePercentage: job.recruiter_fee_percentage ?? 7,
            clientFeeAmount: job.client_fee_amount != null ? Number(job.client_fee_amount) : null,
            recruiterFeeAmount: job.recruiter_fee_amount != null ? Number(job.recruiter_fee_amount) : null,
            clientFeeEstimated: job.client_fee_amount_estimated != null ? Number(job.client_fee_amount_estimated) : null,
            clientFeeProposed: job.client_fee_amount_proposed != null ? Number(job.client_fee_amount_proposed) : null,
            upliftReason: job.client_fee_uplift_reason ?? null,
            upliftNote: job.client_fee_uplift_note ?? null,
            reconfirmRequestedAt: job.client_fee_reconfirm_requested_at ?? null,
            reconfirmDecision: job.client_fee_reconfirm_decision ?? null,
            resubmittedAt: job.resubmitted_at ?? null,
            isExclusive: !!job.is_exclusive,
            guaranteePeriodMonths: job.guarantee_period_months ?? 0,
            status: job.status,
            recruiters: job.current_recruiter_count || 0,
            maxRecruiters: job.max_recruiters || 5,
            maxCandidates: job.max_candidates ?? 8,
            // "X / cap" badge: count candidates occupying a slot (drafts excluded,
            // rejected/withdrawn free their slot) — same predicate as the submission
            // gate, so the badge can never read above the cap again (was: all rows).
            candidates: countCandidatesAgainstCap((job.candidates || []).map((c: any) => c.status)),
            publishedAt: job.created_at,
        };
    });
}

// Full job row for the admin review page — admin client bypasses RLS so admins
// can audit any company's posting for empty/fake/unrealistic content.
export async function getAdminJobById(id: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
        .from("jobs")
        .select(`*, company:companies (company_name, website, logo_url)`)
        .eq("id", id)
        .single();

    if (error || !data) {
        // Query failures surface as a 404 upstream — log so they're diagnosable
        // (a phantom companies.linkedin_url column 404'd every job until 2026-07-08).
        if (error) console.error("[getAdminJobById]", error.message);
        return null;
    }

    return { ...data, company: pickFirst((data as any).company) } as any;
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
            joining_date,
            guarantee_end_date,
            invoice_sent_at,
            payment_received_at,
            created_at
        `)
        .order("created_at", { ascending: false })
        // ponytail: was limit(10) — silently hid rows on the admin's only
        // guarantee-management surface. Paginate if this ever grows past 200.
        .limit(200);

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
            joiningDate: placement.joining_date,
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

export async function getRecruiterAnalytics() {
    const { supabase } = await requireAdmin();

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
    const avgGuaranteeRate = averageGuaranteeRate(metrics.map((m: any) => m.perf_guarantee_success_rate));

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

    const [, stageMetrics] = await Promise.all([
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

    // Sanitize link: only allow same-origin paths; reject absolute / protocol-relative
    // / javascript: URLs. Mirrors safePath() in notifications/create.ts so admin
    // broadcasts can't ship arbitrary URLs into recipient emails.
    const trimmedLink = link?.trim() || "";
    const safeLink =
        trimmedLink && trimmedLink.startsWith("/") && !trimmedLink.startsWith("//")
            ? trimmedLink
            : null;

    // Strip CRLF from title to defend against email-header / log injection.
    const safeTitle = title.trim().replace(/[\r\n\t\v\f]/g, " ");

    // Insert notifications in batch
    const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        title: safeTitle,
        body: body.trim(),
        link: safeLink,
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

    if (error) return { error: "Could not update recruiter fee" };

    revalidatePath("/admin/jobs");
    return { success: true };
}

// Override the locked client fee on a single job. Called from the admin review screen
// before approval. Once approved, the value is treated as final and never recomputed.
export async function updateClientFeeAmount(jobId: string, amount: number) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    if (!Number.isFinite(amount) || amount < 0) return { error: "Invalid amount" };

    const { error } = await supabaseAdmin
        .from("jobs")
        .update({ client_fee_amount: Math.round(amount) })
        .eq("id", jobId);

    if (error) return { error: "Could not update client fee" };

    revalidatePath("/admin/jobs");
    return { success: true };
}

// Override the locked recruiter payout on a single job.
export async function updateRecruiterFeeAmount(jobId: string, amount: number) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    if (!Number.isFinite(amount) || amount < 0) return { error: "Invalid amount" };

    const { error } = await supabaseAdmin
        .from("jobs")
        .update({ recruiter_fee_amount: Math.round(amount) })
        .eq("id", jobId);

    if (error) return { error: "Could not update recruiter fee" };

    revalidatePath("/admin/jobs");
    return { success: true };
}

// Adjust per-job recruiter cap. Bounds: 1–10, default 5.
export async function setJobMaxRecruiters(jobId: string, max: number) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    if (!Number.isInteger(max) || max < 1 || max > 10) {
        return { error: "Cap must be an integer between 1 and 10." };
    }

    const { data: job } = await supabaseAdmin
        .from("jobs")
        .select("current_recruiter_count")
        .eq("id", jobId)
        .single();

    if (job && (job.current_recruiter_count ?? 0) > max) {
        return { error: "Cap cannot be lower than the current number of assigned recruiters." };
    }

    const { error } = await supabaseAdmin
        .from("jobs")
        .update({ max_recruiters: max })
        .eq("id", jobId);

    if (error) {
        console.error("[setJobMaxRecruiters]", error);
        return { error: "Could not update cap." };
    }

    revalidatePath("/admin/jobs");
    return { success: true as const };
}

// Adjust per-job candidate submission cap (default 8). Used to "reopen" a job
// for more submissions once the client has reviewed the current batch.
export async function setJobMaxCandidates(jobId: string, max: number) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    if (!Number.isInteger(max) || max < 1 || max > 200) {
        return { error: "Cap must be an integer between 1 and 200." };
    }

    const { error } = await supabaseAdmin
        .from("jobs")
        .update({ max_candidates: max })
        .eq("id", jobId);

    if (error) {
        console.error("[setJobMaxCandidates]", error);
        return { error: "Could not update cap." };
    }

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
        // Drafts are not real submissions — keep them out of the screening queue.
        .neq("status", "draft")
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

// Full candidate detail for the admin screening page (name / AI-score click).
// Admin-only; surfaces screening answers, recruiter note, salary, and AI score.
export async function getCandidateScreeningDetail(candidateId: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data: c, error } = await supabaseAdmin
        .from("candidates")
        .select(`
            id, first_name, last_name, email, phone, linkedin_url, portfolio_url,
            current_title, current_company, years_experience,
            location_city, location_country, location_status, work_authorization,
            employment_status, employment_status_reason, other_processes, other_processes_stage,
            current_salary, current_salary_currency, current_benefits,
            desired_salary, desired_salary_currency, desired_benefits,
            expected_salary, expected_salary_below_current_reason,
            notice_period, notice_negotiable, first_contact_date, contact_method,
            screening_answers, language_proficiency, assessment_summary, cover_note,
            cv_file_path, ai_match_score, mandate_id, status, created_at,
            recruito_screened_at, recruito_rejected_at, recruito_reject_reason,
            job:jobs(title, company:companies(company_name)),
            recruiter:recruiters(profile:profiles!recruiters_user_id_fkey(full_name))
        `)
        .eq("id", candidateId)
        .single();

    if (error || !c) {
        console.error("[getCandidateScreeningDetail]", error);
        return null;
    }

    const job = pickFirst((c as any).job);
    const company = job ? pickFirst((job as any).company) : null;
    const recruiter = pickFirst((c as any).recruiter);
    const profile = recruiter ? pickFirst((recruiter as any).profile) : null;

    return {
        ...(c as any),
        name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown",
        jobTitle: job?.title || "—",
        companyName: company?.company_name || "—",
        recruiterName: profile?.full_name || "—",
    };
}

// Called from the admin Approve modal when client_fee_amount is higher than
// client_fee_amount_estimated. Atomic: validates, transitions status, writes
// proposal columns, sends in-app notification + email. Status guard prevents
// races with parallel admin actions.
export async function requestClientFeeReconfirm(
    jobId: string,
    reason: ClientFeeUpliftReason,
    note?: string | null,
) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    if (!isValidUpliftReason(reason)) {
        return { error: "Invalid reason" };
    }
    const trimmedNote = (note ?? "").trim() || null;
    if (reason === "custom" && !trimmedNote) {
        return { error: "Note required for custom reason" };
    }

    const { data: job } = await supabaseAdmin
        .from("jobs")
        .select(
            "id, status, title, salary_currency, client_fee_amount, client_fee_amount_estimated, company_id"
        )
        .eq("id", jobId)
        .single();

    if (!job) return { error: "Job not found" };
    if (job.status !== "pending_approval" && job.status !== "pending_client_reconfirm") {
        return { error: "Job is not in a re-confirmable state" };
    }
    if (
        job.client_fee_amount == null ||
        job.client_fee_amount_estimated == null ||
        Number(job.client_fee_amount) <= Number(job.client_fee_amount_estimated)
    ) {
        return { error: "Final fee is not higher than the estimate" };
    }

    const { data: updated, error: updateError } = await supabaseAdmin
        .from("jobs")
        .update({
            status: "pending_client_reconfirm",
            client_fee_amount_proposed: job.client_fee_amount,
            client_fee_uplift_reason: reason,
            client_fee_uplift_note: trimmedNote,
            client_fee_reconfirm_requested_at: new Date().toISOString(),
            client_fee_reconfirm_resolved_at: null,
            client_fee_reconfirm_decision: null,
        })
        .eq("id", jobId)
        .in("status", ["pending_approval", "pending_client_reconfirm"])
        .select("id");

    if (updateError) {
        console.error("[requestClientFeeReconfirm]", updateError);
        return { error: "Could not request re-confirmation" };
    }
    if (!updated || updated.length === 0) {
        return { error: "Job state changed; please refresh." };
    }

    // Best-effort notification dispatch.
    try {
        const { data: company } = await supabaseAdmin
            .from("companies")
            .select("user_id")
            .eq("id", job.company_id)
            .single();
        if (company?.user_id) {
            const dict = await getDictionary();
            const reasonLabel =
                (dict as any)?.feeReconfirm?.reason?.[reason] ?? reasonI18nKey(reason);
            const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/company/jobs/${jobId}`;
            await createNotification(company.user_id, {
                titleKey: "feeReconfirm.cardTitle",
                body: job.title,
                link: `/company/jobs/${jobId}`,
            });
            const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("email")
                .eq("id", company.user_id)
                .single();
            if (profile?.email) {
                const tmpl = feeReconfirmEmail({
                    jobTitle: job.title,
                    originalAmount: Number(job.client_fee_amount_estimated),
                    proposedAmount: Number(job.client_fee_amount),
                    currency: job.salary_currency || "EUR",
                    reasonLabel,
                    note: trimmedNote,
                    jobUrl,
                });
                await sendUserEmail({ to: profile.email, subject: tmpl.subject, html: tmpl.html });
            }
        }
    } catch (err) {
        console.error("[requestClientFeeReconfirm] notify failed", err);
    }

    revalidatePath("/admin/jobs");
    revalidatePath(`/company/jobs/${jobId}`);
    return { success: true as const };
}

// Admin "Request changes" on a pending_approval job: returns it to draft on the
// company side with the admin's note, then notifies the company so they can edit
// and resubmit. Mirrors approveJob's status-guarded update and
// requestClientFeeReconfirm's notify. The .eq("status","pending_approval") guard
// prevents a race with a parallel approve.
export async function requestJobChanges(jobId: string, note: string) {
    const { supabase } = await requireAdmin();

    const trimmed = (note ?? "").trim();
    if (trimmed.length < 5 || trimmed.length > 1000) {
        return { error: "Please describe the requested changes (5–1000 characters)." };
    }

    const { data: job } = await supabase
        .from("jobs")
        .select("id, title, status, company:companies(user_id)")
        .eq("id", jobId)
        .single();

    if (!job) return { error: "Job not found." };
    if (job.status !== "pending_approval") {
        return { error: "Job is not pending approval." };
    }

    const { data: updated, error: updateError } = await supabase
        .from("jobs")
        .update({
            status: "draft",
            changes_requested_note: trimmed,
            changes_requested_at: new Date().toISOString(),
            resubmitted_at: null,
        })
        .eq("id", jobId)
        .eq("status", "pending_approval")
        .select("id");

    if (updateError) {
        console.error("[requestJobChanges]", updateError);
        return { error: "Could not request changes. Please try again." };
    }
    if (!updated || updated.length === 0) {
        return { error: "Job state changed; please refresh." };
    }

    const companyUserId = pickFirst((job as any).company)?.user_id ?? null;
    if (companyUserId) {
        await createNotification(companyUserId, {
            titleKey: "notif.jobChangesRequestedTitle",
            bodyKey: "notif.jobChangesRequestedBody",
            params: { jobTitle: job.title },
            link: `/company/jobs/${jobId}/edit`,
        });
    }

    revalidatePath("/admin/jobs");
    revalidatePath("/company/jobs");
    return { success: true as const };
}

// ===== ADMIN RECRUITER DETAIL =====

export async function getAdminRecruiterById(recruiterId: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data: recruiter, error } = await supabaseAdmin
        .from("recruiters")
        .select(`
            id, user_id, headline, bio, specializations, locations,
            years_experience, linkedin_url, approval_status, approved_at,
            rating, total_placements, created_at
        `)
        .eq("id", recruiterId)
        .single();

    if (error || !recruiter) return null;

    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url")
        .eq("id", recruiter.user_id)
        .single();

    const { data: mandates } = await supabaseAdmin
        .from("job_mandates")
        .select("id, is_active, claimed_at, job:jobs(id, title, status, company:companies(company_name))")
        .eq("recruiter_id", recruiterId)
        .order("claimed_at", { ascending: false });

    const { data: placements } = await supabaseAdmin
        .from("placements")
        .select("id, status, total_fee, recruiter_fee, created_at, job:jobs(title), company:companies(company_name)")
        .eq("recruiter_id", recruiterId)
        .order("created_at", { ascending: false });

    return {
        id: recruiter.id,
        user_id: recruiter.user_id,
        full_name: profile?.full_name || "",
        email: profile?.email || "",
        phone: profile?.phone || "",
        avatar_url: profile?.avatar_url || "",
        headline: recruiter.headline || "",
        bio: recruiter.bio || "",
        specializations: recruiter.specializations || [],
        locations: recruiter.locations || [],
        years_experience: recruiter.years_experience ?? null,
        linkedin_url: recruiter.linkedin_url || "",
        approval_status: recruiter.approval_status,
        approved_at: recruiter.approved_at,
        rating: recruiter.rating || 0,
        total_placements: recruiter.total_placements || 0,
        created_at: recruiter.created_at,
        mandates: (mandates || []).map((m: any) => {
            const job = pickFirst(m.job);
            const company = job ? pickFirst(job.company) : null;
            return {
                id: m.id,
                jobId: job?.id,
                jobTitle: job?.title || "—",
                jobStatus: job?.status,
                companyName: company?.company_name || "—",
                isActive: m.is_active,
                claimedAt: m.claimed_at,
            };
        }),
        placements: (placements || []).map((p: any) => {
            const job = pickFirst(p.job);
            const company = pickFirst(p.company);
            return {
                id: p.id,
                status: p.status,
                totalFee: p.total_fee || 0,
                recruiterFee: p.recruiter_fee || 0,
                createdAt: p.created_at,
                jobTitle: job?.title || "—",
                companyName: company?.company_name || "—",
            };
        }),
    };
}

export async function updateAdminRecruiter(
    recruiterId: string,
    fields: {
        headline?: string | null;
        bio?: string | null;
        specializations?: string[] | null;
        locations?: string[] | null;
        years_experience?: number | null;
        linkedin_url?: string | null;
        full_name?: string | null;
        phone?: string | null;
    },
) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const recruiterUpdate: Record<string, unknown> = {};
    if (fields.headline !== undefined) recruiterUpdate.headline = fields.headline?.trim() || null;
    if (fields.bio !== undefined) recruiterUpdate.bio = fields.bio?.trim() || null;
    if (fields.specializations !== undefined) recruiterUpdate.specializations = fields.specializations;
    if (fields.locations !== undefined) recruiterUpdate.locations = fields.locations;
    if (fields.years_experience !== undefined) {
        const yrs = fields.years_experience;
        if (yrs !== null && (!Number.isInteger(yrs) || yrs < 0 || yrs > 80)) {
            return { error: "Invalid years of experience" };
        }
        recruiterUpdate.years_experience = yrs;
    }
    if (fields.linkedin_url !== undefined) recruiterUpdate.linkedin_url = fields.linkedin_url?.trim() || null;

    const { data: existing } = await supabaseAdmin
        .from("recruiters")
        .select("user_id")
        .eq("id", recruiterId)
        .single();
    if (!existing) return { error: "Recruiter not found" };

    if (Object.keys(recruiterUpdate).length > 0) {
        const { error } = await supabaseAdmin
            .from("recruiters")
            .update(recruiterUpdate)
            .eq("id", recruiterId);
        if (error) {
            console.error("[updateAdminRecruiter]", error);
            return { error: "Could not save recruiter" };
        }
    }

    const profileUpdate: Record<string, unknown> = {};
    if (fields.full_name !== undefined) {
        const name = fields.full_name?.trim();
        if (!name) return { error: "Name is required" };
        profileUpdate.full_name = name;
    }
    if (fields.phone !== undefined) profileUpdate.phone = fields.phone?.trim() || null;

    if (Object.keys(profileUpdate).length > 0) {
        const { error } = await supabaseAdmin
            .from("profiles")
            .update(profileUpdate)
            .eq("id", existing.user_id);
        if (error) {
            console.error("[updateAdminRecruiter:profile]", error);
            return { error: "Could not save profile" };
        }
    }

    revalidatePath(`/admin/recruiters/${recruiterId}`);
    revalidatePath("/admin/recruiters");
    return { success: true as const };
}

// ===== ADMIN COMPANY DETAIL =====

export async function getAdminCompanyById(companyId: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data: company, error } = await supabaseAdmin
        .from("companies")
        .select(`
            id, user_id, company_name, org_number, description, industry,
            website, logo_url, city, country, employee_count,
            billing_email, billing_address, is_verified, created_at
        `)
        .eq("id", companyId)
        .single();

    if (error || !company) return null;

    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("id", company.user_id)
        .single();

    const { data: jobs } = await supabaseAdmin
        .from("jobs")
        .select("id, title, status, city, location, country, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

    const { data: placements } = await supabaseAdmin
        .from("placements")
        .select("id, status, total_fee, created_at, job:jobs(title)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

    return {
        id: company.id,
        user_id: company.user_id,
        company_name: company.company_name || "",
        org_number: company.org_number || "",
        description: company.description || "",
        industry: company.industry || "",
        website: company.website || "",
        logo_url: company.logo_url || "",
        city: company.city || "",
        country: company.country || "",
        employee_count: company.employee_count || "",
        billing_email: company.billing_email || "",
        billing_address: company.billing_address || "",
        is_verified: !!company.is_verified,
        created_at: company.created_at,
        contact: {
            full_name: profile?.full_name || "",
            email: profile?.email || "",
            phone: profile?.phone || "",
        },
        jobs: (jobs || []).map((j: any) => ({
            id: j.id,
            title: j.title,
            status: j.status,
            location: j.location || "",
            city: j.city ?? null,
            country: j.country ?? null,
            createdAt: j.created_at,
        })),
        placements: (placements || []).map((p: any) => {
            const job = pickFirst(p.job);
            return {
                id: p.id,
                status: p.status,
                totalFee: p.total_fee || 0,
                createdAt: p.created_at,
                jobTitle: job?.title || "—",
            };
        }),
    };
}

export async function updateAdminCompany(
    companyId: string,
    fields: {
        company_name?: string | null;
        org_number?: string | null;
        description?: string | null;
        industry?: string | null;
        website?: string | null;
        logo_url?: string | null;
        city?: string | null;
        country?: string | null;
        employee_count?: string | null;
        billing_email?: string | null;
        billing_address?: string | null;
        is_verified?: boolean;
        contact_full_name?: string | null;
        contact_phone?: string | null;
    },
) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const companyUpdate: Record<string, unknown> = {};
    const text = (v: string | null | undefined) => v?.trim() || null;
    if (fields.company_name !== undefined) {
        const name = fields.company_name?.trim();
        if (!name) return { error: "Company name is required" };
        companyUpdate.company_name = name;
    }
    if (fields.org_number !== undefined) companyUpdate.org_number = text(fields.org_number);
    if (fields.description !== undefined) companyUpdate.description = text(fields.description);
    if (fields.industry !== undefined) companyUpdate.industry = text(fields.industry);
    if (fields.website !== undefined) companyUpdate.website = text(fields.website);
    if (fields.logo_url !== undefined) companyUpdate.logo_url = text(fields.logo_url);
    if (fields.city !== undefined) companyUpdate.city = text(fields.city);
    if (fields.country !== undefined) companyUpdate.country = text(fields.country);
    if (fields.employee_count !== undefined) companyUpdate.employee_count = text(fields.employee_count);
    if (fields.billing_email !== undefined) companyUpdate.billing_email = text(fields.billing_email);
    if (fields.billing_address !== undefined) companyUpdate.billing_address = text(fields.billing_address);
    if (fields.is_verified !== undefined) companyUpdate.is_verified = !!fields.is_verified;

    const { data: existing } = await supabaseAdmin
        .from("companies")
        .select("user_id")
        .eq("id", companyId)
        .single();
    if (!existing) return { error: "Company not found" };

    if (Object.keys(companyUpdate).length > 0) {
        const { error } = await supabaseAdmin
            .from("companies")
            .update(companyUpdate)
            .eq("id", companyId);
        if (error) {
            console.error("[updateAdminCompany]", error);
            return { error: "Could not save company" };
        }
    }

    const profileUpdate: Record<string, unknown> = {};
    if (fields.contact_full_name !== undefined) {
        const name = fields.contact_full_name?.trim();
        if (!name) return { error: "Contact name is required" };
        profileUpdate.full_name = name;
    }
    if (fields.contact_phone !== undefined) profileUpdate.phone = text(fields.contact_phone);

    if (Object.keys(profileUpdate).length > 0) {
        const { error } = await supabaseAdmin
            .from("profiles")
            .update(profileUpdate)
            .eq("id", existing.user_id);
        if (error) {
            console.error("[updateAdminCompany:profile]", error);
            return { error: "Could not save contact" };
        }
    }

    revalidatePath(`/admin/companies/${companyId}`);
    revalidatePath("/admin/companies");
    return { success: true as const };
}

// One-click revert. Restores client_fee_amount to the estimated baseline,
// clears the proposal, marks decision='withdrawn', publishes the job.
export async function withdrawClientFeeReconfirm(jobId: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data: job } = await supabaseAdmin
        .from("jobs")
        .select("id, status, client_fee_amount_estimated, published_at")
        .eq("id", jobId)
        .single();

    if (!job) return { error: "Job not found" };
    if (job.status !== "pending_client_reconfirm") {
        return { error: "Job is not awaiting re-confirmation" };
    }
    if (job.client_fee_amount_estimated == null) {
        return { error: "No baseline estimate to revert to" };
    }

    const { data: updated, error } = await supabaseAdmin
        .from("jobs")
        .update({
            status: "active",
            client_fee_amount: job.client_fee_amount_estimated,
            client_fee_amount_proposed: null,
            client_fee_uplift_reason: null,
            client_fee_uplift_note: null,
            client_fee_reconfirm_resolved_at: new Date().toISOString(),
            client_fee_reconfirm_decision: "withdrawn",
            published_at: job.published_at ?? new Date().toISOString(),
        })
        .eq("id", jobId)
        .eq("status", "pending_client_reconfirm")
        .select("id");

    if (error) {
        console.error("[withdrawClientFeeReconfirm]", error);
        return { error: "Could not withdraw re-confirmation" };
    }
    if (!updated || updated.length === 0) {
        return { error: "Job state changed; please refresh." };
    }

    revalidatePath("/admin/jobs");
    revalidatePath(`/company/jobs/${jobId}`);
    return { success: true as const };
}
