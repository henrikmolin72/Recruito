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

/** Whether the current user's company has accepted the candidate-view notice. */
export async function getCandidateProfileNoticeAccepted(): Promise<boolean> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
        .from("companies")
        .select("candidate_profile_notice_accepted")
        .eq("user_id", user.id)
        .single();

    return (data as any)?.candidate_profile_notice_accepted === true;
}

/** Record one-time acceptance of the candidate-view notice for the company. */
export async function acceptCandidateProfileNotice(): Promise<{ success: true } | { error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Ej inloggad" };

    const { error } = await supabase
        .from("companies")
        .update({ candidate_profile_notice_accepted: true })
        .eq("user_id", user.id);

    if (error) {
        console.error("[acceptCandidateProfileNotice]", error);
        return { error: "Något gick fel. Försök igen." };
    }
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
            company: { company_name: user.user_metadata?.full_name || "Mitt Företag" } as Company,
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
    // Company-facing counts only include candidates Recruito has approved
    // (recruito_screened_at set) — in-review/rejected candidates stay hidden.
    const { count: totalCandidates } = jobIds.length > 0
        ? await supabase
            .from("candidates")
            .select("*", { count: 'exact', head: true })
            .in("job_id", jobIds)
            .not("recruito_screened_at", "is", null)
        : { count: 0 };

    const { count: activeInterviews } = jobIds.length > 0
        ? await supabase
            .from("candidates")
            .select("*", { count: 'exact', head: true })
            .in("job_id", jobIds)
            .eq("status", "interview")
            .not("recruito_screened_at", "is", null)
        : { count: 0 };

    const { data: candidateJobRows, error: candidateJobRowsError } = jobIds.length > 0
        ? await supabase
            .from("candidates")
            .select("job_id")
            .in("job_id", jobIds)
            .not("recruito_screened_at", "is", null)
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
    const draftJobsCount = jobs?.filter(j => j.status === 'draft').length || 0;
    const closedJobsCount = jobs?.filter(j => j.status === 'closed' || j.status === 'paused').length || 0;

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
            draftJobs: draftJobsCount,
            closedJobs: closedJobsCount,
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
