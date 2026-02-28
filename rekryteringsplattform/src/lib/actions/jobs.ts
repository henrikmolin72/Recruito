"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validateJobForm, validatePipelineStages } from "@/lib/validation/forms";
import { getFeePercentage, getTierForPlacementCount, TIER_WINDOW_MONTHS } from "@/lib/pricing";
import { DEFAULT_PIPELINE_STAGES } from "@/types/enums";
import { createNotification } from "@/lib/actions/notifications";
import type { PipelineStage } from "@/types/db-types";
import { createTranslator } from "@/i18n/server";

async function verifyJobOwnership(jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const t = await createTranslator();
    if (!user) return { error: t("serverErrors.notLoggedIn"), supabase, user: null };

    const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!company) return { error: t("serverErrors.noCompanyProfileFound"), supabase, user };

    const { data: job } = await supabase
        .from("jobs")
        .select("id")
        .eq("id", jobId)
        .eq("company_id", company.id)
        .single();

    if (!job) return { error: t("serverErrors.jobNotFoundOrNotOwned"), supabase, user };

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
        const t = await createTranslator();
        return { error: t("serverErrors.companyProfileNotFound") };
    }

    // 3. Calculate fee from volume tier
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - TIER_WINDOW_MONTHS);

    const { count: recentPlacements } = await supabase
        .from("placements")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .gte("created_at", twelveMonthsAgo.toISOString());

    const placementCount = recentPlacements ?? 0;
    const feePercentage = getFeePercentage(placementCount);
    const tier = getTierForPlacementCount(placementCount);

    // 3b. Enforce job posting limits based on tier
    const { count: activeJobCount } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("status", "active");

    if ((activeJobCount ?? 0) >= tier.maxActiveJobs) {
        const t = await createTranslator();
        return { error: t("serverErrors.jobPostingLimitReached").replace("{max}", String(tier.maxActiveJobs)) };
    }

    // 4. Parse pipeline stages (optional, defaults applied)
    let pipelineStages: PipelineStage[] = DEFAULT_PIPELINE_STAGES;
    const rawPipeline = formData.get("pipeline_stages");
    if (rawPipeline && typeof rawPipeline === "string") {
        try {
            const parsedPipeline = JSON.parse(rawPipeline);
            const validation = validatePipelineStages(parsedPipeline);
            if (validation.success) {
                pipelineStages = validation.data;
            }
        } catch { /* use default */ }
    }

    // 5. Insert job
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
        pipeline_stages: pipelineStages,
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

export async function getCompanyJobLimitInfo() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!company) return null;

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - TIER_WINDOW_MONTHS);

    const [{ count: recentPlacements }, { count: activeJobs }] = await Promise.all([
        supabase
            .from("placements")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id)
            .gte("created_at", twelveMonthsAgo.toISOString()),
        supabase
            .from("jobs")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id)
            .eq("status", "active"),
    ]);

    const tier = getTierForPlacementCount(recentPlacements ?? 0);

    return {
        activeJobs: activeJobs ?? 0,
        maxActiveJobs: tier.maxActiveJobs,
        tierLabelKey: tier.labelKey,
        atLimit: (activeJobs ?? 0) >= tier.maxActiveJobs,
    };
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
    return { success: true };
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
    return { success: true };
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
    return { success: true };
}

export async function updatePipelineStages(jobId: string, stages: PipelineStage[]) {
    const { error: authError, supabase } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };

    const validation = validatePipelineStages(stages);
    if (!validation.success) return { error: validation.error };

    // Check no active candidates are orphaned
    const { data: activeCandidates } = await supabase
        .from("candidates")
        .select("id, current_pipeline_stage")
        .eq("job_id", jobId)
        .not("current_pipeline_stage", "is", null)
        .not("status", "in", "(hired,rejected,declined,completed)");

    const newStageIds = new Set(validation.data.map(s => s.id));
    const orphaned = activeCandidates?.filter(
        c => c.current_pipeline_stage && !newStageIds.has(c.current_pipeline_stage)
    );

    if (orphaned && orphaned.length > 0) {
        const t = await createTranslator();
        return { error: t("serverErrors.activeCandidatesInRemovedStages") };
    }

    const { error } = await supabase
        .from("jobs")
        .update({ pipeline_stages: validation.data })
        .eq("id", jobId);

    if (error) return { error: error.message };

    // Notify recruiters that the pipeline has changed
    const { data: mandates } = await supabase
        .from("job_mandates")
        .select("recruiter:recruiters(user_id)")
        .eq("job_id", jobId)
        .eq("is_active", true);

    const { data: job } = await supabase
        .from("jobs")
        .select("title")
        .eq("id", jobId)
        .single();

    if (mandates) {
        for (const mandate of mandates) {
            const recruiterData = mandate.recruiter;
            const userId = Array.isArray(recruiterData) ? recruiterData[0]?.user_id : (recruiterData as any)?.user_id;
            if (userId) {
                await createNotification(
                    userId,
                    "Rekryteringsprocess uppdaterad",
                    `Processen för "${job?.title}" har ändrats. Kontrollera de nya stegen.`,
                    `/recruiter/mandates`
                );
            }
        }
    }

    revalidatePath(`/company/jobs/${jobId}`);
    return { success: true };
}
