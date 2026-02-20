"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validateJobForm } from "@/lib/validation/forms";
import { getFeePercentage, TIER_WINDOW_MONTHS } from "@/lib/pricing";

async function verifyJobOwnership(jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Ej inloggad", supabase, user: null };

    const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!company) return { error: "Ingen företagsprofil hittades", supabase, user };

    const { data: job } = await supabase
        .from("jobs")
        .select("id")
        .eq("id", jobId)
        .eq("company_id", company.id)
        .single();

    if (!job) return { error: "Jobbet hittades inte eller tillhör inte ditt företag", supabase, user };

    return { error: null, supabase, user };
}

export async function createJob(formData: FormData) {
    const supabase = await createClient();

    const parsed = validateJobForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // 2. Get company profile to link job to company
    const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (companyError || !company) {
        console.error("Company not found:", companyError);
        return { error: "Kunde inte hitta företagsprofilen" };
    }

    // 3. Calculate fee from volume tier
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - TIER_WINDOW_MONTHS);

    const { count: recentPlacements } = await supabase
        .from("placements")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .gte("created_at", twelveMonthsAgo.toISOString());

    const feePercentage = getFeePercentage(recentPlacements ?? 0);

    // 4. Insert job
    const { error: jobError } = await supabase.from("jobs").insert({
        company_id: company.id,
        title: parsed.data.title,
        description: parsed.data.description,
        location: parsed.data.location,
        industry: parsed.data.industry,
        employment_type: parsed.data.employment_type,
        salary_min: parsed.data.salary_min,
        salary_max: parsed.data.salary_max,
        salary_currency: parsed.data.salary_currency,
        fee_percentage: feePercentage,
        max_recruiters: parsed.data.max_recruiters,
        status: "active",
    });

    if (jobError) {
        console.error("Error creating job:", jobError);
        return { error: jobError.message };
    }

    revalidatePath("/company");
    revalidatePath("/company/jobs");
    redirect("/company/jobs");
}

export async function getCompanyJobs() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!company) return [];

    const { data: jobs } = await supabase
        .from("jobs")
        .select(`
      *,
      candidates:candidates(count),
      mandates:job_mandates(count)
    `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

    return jobs?.map((job) => ({
        ...job,
        recruiters_count: job.current_recruiter_count || 0,
        candidates_count: job.candidates?.[0]?.count || 0,
    })) || [];
}

export async function updateJob(jobId: string, formData: FormData) {
    const { error: authError, supabase } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };

    const parsed = validateJobForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    const { error } = await supabase
        .from("jobs")
        .update({
            title: parsed.data.title,
            description: parsed.data.description,
            location: parsed.data.location,
            industry: parsed.data.industry,
            employment_type: parsed.data.employment_type,
            salary_min: parsed.data.salary_min,
            salary_max: parsed.data.salary_max,
            salary_currency: parsed.data.salary_currency,
            max_recruiters: parsed.data.max_recruiters,
        })
        .eq("id", jobId);

    if (error) {
        console.error("Error updating job:", error);
        return { error: error.message };
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/company/jobs");
    redirect(`/company/jobs/${jobId}`);
}

export async function closeJob(jobId: string) {
    const { error: authError, supabase } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };

    const { error } = await supabase
        .from("jobs")
        .update({ status: 'closed' })
        .eq("id", jobId);

    if (error) return { error: error.message };

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/company/jobs");
}

export async function pauseJob(jobId: string) {
    const { error: authError, supabase } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };

    const { error } = await supabase
        .from("jobs")
        .update({ status: 'paused' })
        .eq("id", jobId);

    if (error) return { error: error.message };

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/company/jobs");
}

export async function resumeJob(jobId: string) {
    const { error: authError, supabase } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };

    const { error } = await supabase
        .from("jobs")
        .update({ status: 'active' })
        .eq("id", jobId);

    if (error) return { error: error.message };

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/company/jobs");
}
