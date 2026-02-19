"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Job, Company } from "@/types/db-types";

import { revalidatePath } from "next/cache";

// Helper to handle errors or redirect
function handleError(error: any) {
    console.error(error);
    if (error.message === "JWT_EXPIRED") {
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

    const companyName = formData.get("company_name") as string;
    const orgNumber = formData.get("org_number") as string;
    const description = formData.get("description") as string;
    const city = formData.get("city") as string;
    const industry = formData.get("industry") as string;
    const website = formData.get("website") as string;
    const contactName = formData.get("contact_name") as string;
    const contactEmail = formData.get("contact_email") as string;

    // Update company
    const { error: companyError } = await supabase
        .from("companies")
        .update({
            company_name: companyName,
            org_number: orgNumber || null,
            description: description || null,
            city: city || null,
            industry: industry || null,
            website: website || null,
            billing_email: contactEmail || null,
        })
        .eq("user_id", user.id);

    if (companyError) return { error: companyError.message };

    // Update profile name
    if (contactName) {
        await supabase.from("profiles").update({ full_name: contactName }).eq("id", user.id);
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
            stats: { activeJobs: 0, candidates: 0, interviews: 0, placements: 0 },
            recentActivity: []
        };
    }

    // 3. Get jobs for this company
    const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select(`
      *,
      candidates:candidates(count),
      mandates:job_mandates(count)
    `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

    if (jobsError) {
        handleError(jobsError);
    }

    // 4. Calculate stats
    // For candidates count, we need a separate query or join.
    // The above join gives counts per job.

    // Let's get total candidates across all jobs
    const { count: totalCandidates } = await supabase
        .from("candidates")
        .select("*", { count: 'exact', head: true })
        .in("job_id", jobs?.map(j => j.id) || []);

    const { count: activeInterviews } = await supabase
        .from("candidates")
        .select("*", { count: 'exact', head: true })
        .in("job_id", jobs?.map(j => j.id) || [])
        .eq("status", "interview");

    const { count: successfulPlacements } = await supabase
        .from("placements")
        .select("*", { count: 'exact', head: true })
        .eq("company_id", company.id);

    const activeJobsCount = jobs?.filter(j => j.status === 'active').length || 0;

    // Transform jobs for display
    const jobsFormatted = jobs?.map((job) => ({
        ...job,
        candidates_count: job.candidates?.[0]?.count || 0, // supabase returns array of objects for count
        recruiters_count: job.current_recruiter_count || 0,
    })) || [];

    return {
        company: company as Company,
        jobs: jobsFormatted,
        stats: {
            activeJobs: activeJobsCount,
            candidates: totalCandidates || 0,
            interviews: activeInterviews || 0,
            placements: successfulPlacements || 0
        },
        // We don't have activity log yet populated, return empty or mock
        recentActivity: []
    };
}
