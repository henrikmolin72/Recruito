"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createJob(formData: FormData) {
    const supabase = await createClient();

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const location = formData.get("location") as string;
    const industry = formData.get("industry") as string;
    const employment_type = formData.get("employment_type") as string;
    const salary_min = parseInt(formData.get("salary_min") as string) || null;
    const salary_max = parseInt(formData.get("salary_max") as string) || null;
    const salary_currency = formData.get("salary_currency") as string;
    const fee_percentage = parseFloat(formData.get("fee_percentage") as string) || 15.0;
    const max_recruiters = parseInt(formData.get("max_recruiters") as string) || 5;

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

    // 3. Insert job
    const { error: jobError } = await supabase.from("jobs").insert({
        company_id: company.id,
        title,
        description,
        location,
        industry,
        employment_type,
        salary_min,
        salary_max,
        salary_currency,
        fee_percentage,
        max_recruiters,
        status: "active", // Default to active for now
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const location = formData.get("location") as string;
    const industry = formData.get("industry") as string;
    const employment_type = formData.get("employment_type") as string;
    const salary_min = parseInt(formData.get("salary_min") as string) || null;
    const salary_max = parseInt(formData.get("salary_max") as string) || null;
    const salary_currency = formData.get("salary_currency") as string;
    const fee_percentage = parseFloat(formData.get("fee_percentage") as string) || 15.0;
    const max_recruiters = parseInt(formData.get("max_recruiters") as string) || 5;

    const { error } = await supabase
        .from("jobs")
        .update({
            title,
            description,
            location,
            industry,
            employment_type,
            salary_min,
            salary_max,
            salary_currency,
            fee_percentage,
            max_recruiters,
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { error } = await supabase
        .from("jobs")
        .update({ status: 'closed' })
        .eq("id", jobId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/company/jobs");
}

export async function pauseJob(jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { error } = await supabase
        .from("jobs")
        .update({ status: 'paused' })
        .eq("id", jobId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/company/jobs");
}

export async function resumeJob(jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { error } = await supabase
        .from("jobs")
        .update({ status: 'active' })
        .eq("id", jobId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/company/jobs");
}
