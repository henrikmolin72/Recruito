"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validateJobForm, validatePipelineStages } from "@/lib/validation/forms";
import { getFeePercentage, TIER_WINDOW_MONTHS } from "@/lib/pricing";
import { DEFAULT_PIPELINE_STAGES } from "@/types/enums";
import { createNotification } from "@/lib/actions/notifications";
import type { PipelineStage } from "@/types/db-types";

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
    const isDraft = formData.get("status") === "draft";

    const parsed = await validateJobForm(formData);
    if (!parsed.success && !isDraft) {
        return { error: parsed.error };
    }

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // 2. Get company profile to link job to company (auto-create if missing)
    let { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!company) {
        // Only auto-create for company-role users, not recruiters
        const role = user.app_metadata?.role || user.user_metadata?.role;
        if (role === "recruiter") {
            return { error: "Rekryterare kan inte skapa uppdrag. Logga in som företag." };
        }

        // Auto-create a company profile for this user
        const companyName = (user.user_metadata?.company_name || "").slice(0, 200)
            || user.email?.split("@")[0] || "Mitt företag";
        const { data: newCompany, error: createError } = await supabase
            .from("companies")
            .insert({
                user_id: user.id,
                company_name: companyName,
            })
            .select("id")
            .single();

        if (createError) {
            // If unique constraint — company was created in a parallel request, re-fetch
            if (createError.code === "23505") {
                const { data: refetched } = await supabase
                    .from("companies")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();
                if (refetched) {
                    company = refetched;
                } else {
                    console.error("Could not create company profile:", createError);
                    return { error: "Kunde inte skapa företagsprofil. Kontakta support." };
                }
            } else {
                console.error("Could not create company profile:", createError);
                return { error: "Kunde inte skapa företagsprofil. Kontakta support." };
            }
        } else if (!newCompany) {
            return { error: "Kunde inte skapa företagsprofil. Kontakta support." };
        } else {
            company = newCompany;
        }
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

    // 5. Insert job with all fields
    // For drafts, parsed.data may be undefined if validation failed — use raw form values as fallback
    const d = parsed.data ?? {} as Record<string, unknown>;
    const raw = (key: string) => formData.get(key)?.toString() || "";
    const { error: jobError } = await supabase.from("jobs").insert({
        company_id: company.id,
        // Basics
        title: d.title || raw("title") || "Untitled Draft",
        description: d.description || raw("description") || null,
        location: d.location || raw("location") || raw("city") || null,
        industry: d.industry ?? raw("industry") ?? "",
        country: d.country ?? raw("country") ?? null,
        city: d.city ?? raw("city") ?? null,
        location_code: d.location_code ?? raw("location_code") ?? null,
        is_confidential: d.is_confidential ?? false,
        // Employment
        employment_type: d.employment_type || raw("employment_type") || "full_time",
        contract_duration: d.contract_duration,
        work_type: d.work_type,
        remote_type: d.remote_type,
        work_permit_accepted: d.work_permit_accepted,
        visa_sponsorship: d.visa_sponsorship,
        // Description structured
        team_structure: d.team_structure,
        tools_technologies: d.tools_technologies,
        management_required: d.management_required ?? false,
        team_size: d.team_size,
        reporting_to: d.reporting_to,
        key_requirements: d.key_requirements,
        language_requirements: d.language_requirements,
        position_type: d.position_type,
        open_positions: d.open_positions,
        // Legacy requirement fields
        min_years_experience: d.min_years_experience,
        required_degree: d.required_degree,
        required_certifications: d.required_certifications,
        required_technical_skills: d.required_technical_skills,
        required_industry_experience: d.required_industry_experience,
        required_language: d.required_language,
        required_language_level: d.required_language_level,
        // Salary
        salary_min: d.salary_min,
        salary_max: d.salary_max,
        salary_currency: d.salary_currency,
        salary_gross_net: d.salary_gross_net,
        salary_period: d.salary_period,
        bonus_structure: d.bonus_structure,
        benefits: d.benefits,
        benefits_other: d.benefits_other,
        // Recruitment details
        fee_percentage: feePercentage,
        max_recruiters: d.max_recruiters,
        application_deadline: d.application_deadline || null,
        guarantee_period_months: d.guarantee_period_months,
        recruiter_fee_manual: d.recruiter_fee_manual,
        // Screening & hiring
        screening_questions: d.screening_questions,
        interview_type: d.interview_type,
        num_interviews: d.num_interviews,
        interview_conductors: d.interview_conductors,
        technical_test_required: d.technical_test_required,
        assessment_type: d.assessment_type,
        // Working conditions
        working_hours: d.working_hours,
        flexible_hours: d.flexible_hours,
        shift_work: d.shift_work,
        shift_timings: d.shift_timings,
        overtime_policy: d.overtime_policy,
        // Timeline
        desired_start_date: d.desired_start_date || null,
        urgency_level: d.urgency_level,
        // Other
        travel_required: d.travel_required,
        background_check_required: d.background_check_required,
        // Pipeline & status
        pipeline_stages: pipelineStages,
        status: isDraft ? "draft" : "active",
    });

    if (jobError) {
        console.error("Error creating job:", jobError);
        return { error: jobError.message };
    }

    revalidatePath("/company");
    revalidatePath("/company/jobs");

    if (isDraft) {
        return { success: true };
    }

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

    const parsed = await validateJobForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    const d = parsed.data;
    const { error } = await supabase
        .from("jobs")
        .update({
            title: d.title,
            description: d.description,
            location: d.location,
            industry: d.industry,
            country: d.country,
            city: d.city,
            location_code: d.location_code,
            is_confidential: d.is_confidential ?? false,
            employment_type: d.employment_type,
            contract_duration: d.contract_duration,
            work_type: d.work_type,
            remote_type: d.remote_type,
            work_permit_accepted: d.work_permit_accepted,
            visa_sponsorship: d.visa_sponsorship,
            team_structure: d.team_structure,
            tools_technologies: d.tools_technologies,
            management_required: d.management_required ?? false,
            team_size: d.team_size,
            reporting_to: d.reporting_to,
            key_requirements: d.key_requirements,
            language_requirements: d.language_requirements,
            position_type: d.position_type,
            open_positions: d.open_positions,
            min_years_experience: d.min_years_experience,
            required_degree: d.required_degree,
            required_certifications: d.required_certifications,
            required_technical_skills: d.required_technical_skills,
            required_industry_experience: d.required_industry_experience,
            required_language: d.required_language,
            required_language_level: d.required_language_level,
            salary_min: d.salary_min,
            salary_max: d.salary_max,
            salary_currency: d.salary_currency,
            salary_gross_net: d.salary_gross_net,
            salary_period: d.salary_period,
            bonus_structure: d.bonus_structure,
            benefits: d.benefits,
            benefits_other: d.benefits_other,
            max_recruiters: d.max_recruiters,
            application_deadline: d.application_deadline || null,
            guarantee_period_months: d.guarantee_period_months,
            recruiter_fee_manual: d.recruiter_fee_manual,
            screening_questions: d.screening_questions,
            interview_type: d.interview_type,
            num_interviews: d.num_interviews,
            interview_conductors: d.interview_conductors,
            technical_test_required: d.technical_test_required,
            assessment_type: d.assessment_type,
            working_hours: d.working_hours,
            flexible_hours: d.flexible_hours,
            shift_work: d.shift_work,
            shift_timings: d.shift_timings,
            overtime_policy: d.overtime_policy,
            desired_start_date: d.desired_start_date || null,
            urgency_level: d.urgency_level,
            travel_required: d.travel_required,
            background_check_required: d.background_check_required,
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

    const { data: job } = await supabase.from("jobs").select("status").eq("id", jobId).single();
    if (!job || (job.status !== "active" && job.status !== "paused")) {
        return { error: "Jobbet kan inte stängas från dess nuvarande status." };
    }

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

    const { data: job } = await supabase.from("jobs").select("status").eq("id", jobId).single();
    if (!job || job.status !== "active") {
        return { error: "Endast aktiva jobb kan pausas." };
    }

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

    const { data: job } = await supabase.from("jobs").select("status").eq("id", jobId).single();
    if (!job || job.status !== "paused") {
        return { error: "Endast pausade jobb kan återupptas." };
    }

    const { error } = await supabase
        .from("jobs")
        .update({ status: 'active' })
        .eq("id", jobId);

    if (error) return { error: error.message };

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/company/jobs");
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
        return { error: "Det finns aktiva kandidater i steg som du försöker ta bort. Flytta dem först." };
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
            const userId = (mandate.recruiter as any)?.user_id;
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
