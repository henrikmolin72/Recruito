"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validateJobForm, validatePipelineStages } from "@/lib/validation/forms";
import { getFeePercentage, TIER_WINDOW_MONTHS } from "@/lib/pricing";
import { calculateClientFee, calculateRecruiterFee } from "@/lib/utils";
import { DEFAULT_PIPELINE_STAGES } from "@/types/enums";
import { createNotification } from "@/lib/notifications/create";
import { countRecruitersWithoutDelivery } from "@/lib/recruiter-search-count";
import { sendUserEmail } from "@/lib/email/internal-notifications";
import { newJobNotificationEmail } from "@/lib/email/email-templates";
import { requireAdmin } from "@/lib/actions/require-admin";
import { rejectRemainingCandidates, notifyRecruitersOfJobLifecycleChange } from "@/lib/job-fill";
import type { PipelineStage } from "@/types/db-types";

async function verifyJobOwnership(jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Ej inloggad", supabase, user: null };

    const { data: company } = await supabase
        .from("companies")
        .select("id, company_name")
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
        .select("id, company_name")
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
            .select("id, company_name")
            .single();

        if (createError) {
            // If unique constraint — company was created in a parallel request, re-fetch
            if (createError.code === "23505") {
                const { data: refetched } = await supabase
                    .from("companies")
                    .select("id, company_name")
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
    const rawOrNull = (key: string) => formData.get(key)?.toString() || null;
    const rawInt = (key: string) => { const v = formData.get(key)?.toString(); if (!v) return null; const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; };
    const rawFloat = (key: string) => { const v = formData.get(key)?.toString(); if (!v) return null; const n = parseFloat(v); return Number.isNaN(n) ? null : n; };
    const rawBool = (key: string) => formData.get(key) === "on" || formData.get(key) === "true";
    const rawJson = (key: string) => { try { const v = formData.get(key)?.toString(); return v ? JSON.parse(v) : null; } catch { return null; } };

    // Lock client + recruiter fees on the row using the calculator formula.
    // After approval these are immutable from the client side; admin override flows
    // through dedicated server actions in admin.ts.
    const dAny = d as Record<string, unknown>;
    const salaryMin = (dAny.salary_min as number | undefined) ?? rawInt("salary_min");
    const salaryMax = (dAny.salary_max as number | undefined) ?? rawInt("salary_max");
    const guaranteeMonths = (dAny.guarantee_period_months as number | undefined) ?? rawInt("guarantee_period_months") ?? 0;
    const isExclusive = (dAny.is_exclusive as boolean | undefined) ?? rawBool("is_exclusive");
    const feeBaseSalary = salaryMax || salaryMin || 0;
    const lockedClientFee = feeBaseSalary > 0
        ? calculateClientFee(feeBaseSalary, guaranteeMonths || 0, isExclusive)
        : null;
    const lockedRecruiterFee = feeBaseSalary > 0
        ? calculateRecruiterFee(feeBaseSalary)
        : null;

    // If updating an existing draft, use upsert with the provided ID
    const existingDraftId = formData.get("draft_id")?.toString();
    const jobPayload = {
        ...(existingDraftId ? { id: existingDraftId } : {}),
        company_id: company.id,
        // Basics
        title: d.title || raw("title") || "Untitled Draft",
        description: d.description ?? rawOrNull("description") ?? "",
        location: d.location || raw("location") || raw("city") || null,
        industry: d.industry ?? raw("industry") ?? "",
        country: d.country ?? rawOrNull("country"),
        city: d.city ?? rawOrNull("city"),
        location_code: d.location_code ?? rawOrNull("location_code"),
        is_confidential: d.is_confidential ?? rawBool("is_confidential"),
        // Employment
        employment_type: d.employment_type || raw("employment_type") || "full_time",
        contract_duration: d.contract_duration ?? rawOrNull("contract_duration"),
        work_type: d.work_type ?? rawOrNull("work_type"),
        remote_type: d.remote_type ?? rawOrNull("remote_type"),
        work_permit_accepted: d.work_permit_accepted ?? rawBool("work_permit_accepted"),
        visa_sponsorship: d.visa_sponsorship ?? rawBool("visa_sponsorship"),
        // Description structured
        team_structure: d.team_structure ?? rawOrNull("team_structure"),
        tools_technologies: d.tools_technologies ?? rawOrNull("tools_technologies"),
        management_required: d.management_required ?? rawBool("management_required"),
        team_size: d.team_size ?? rawInt("team_size"),
        reporting_to: d.reporting_to ?? rawOrNull("reporting_to"),
        key_requirements: d.key_requirements ?? rawJson("key_requirements"),
        language_requirements: d.language_requirements ?? rawJson("language_requirements"),
        position_type: d.position_type ?? rawOrNull("position_type"),
        open_positions: d.open_positions ?? rawInt("open_positions"),
        // Legacy requirement fields
        min_years_experience: d.min_years_experience ?? rawInt("min_years_experience"),
        required_degree: d.required_degree ?? rawOrNull("required_degree"),
        required_certifications: d.required_certifications ?? rawOrNull("required_certifications"),
        required_technical_skills: d.required_technical_skills ?? rawOrNull("required_technical_skills"),
        required_industry_experience: d.required_industry_experience ?? rawOrNull("required_industry_experience"),
        required_language: d.required_language ?? rawOrNull("required_language"),
        required_language_level: d.required_language_level ?? rawOrNull("required_language_level"),
        // Salary
        salary_min: d.salary_min ?? rawInt("salary_min"),
        salary_max: d.salary_max ?? rawInt("salary_max"),
        salary_currency: d.salary_currency ?? (raw("salary_currency") || "SEK"),
        salary_gross_net: d.salary_gross_net ?? rawOrNull("salary_gross_net"),
        salary_period: d.salary_period ?? rawOrNull("salary_period"),
        bonus_structure: d.bonus_structure ?? rawOrNull("bonus_structure"),
        benefits: d.benefits ?? formData.getAll("benefits").map(String).filter(Boolean),
        benefits_other: d.benefits_other ?? rawOrNull("benefits_other"),
        // Recruitment details
        fee_percentage: feePercentage,
        is_exclusive: isExclusive,
        client_fee_amount: lockedClientFee,
        // Snapshot the baseline once at submission. Drafts get NULL; the estimate is
        // recorded the moment the row leaves draft. Per the design, this column is
        // written exactly once and never recomputed thereafter.
        client_fee_amount_estimated: isDraft ? null : lockedClientFee,
        recruiter_fee_amount: lockedRecruiterFee,
        max_recruiters: d.max_recruiters ?? rawInt("max_recruiters"),
        application_deadline: d.application_deadline || rawOrNull("application_deadline"),
        guarantee_period_months: guaranteeMonths,
        recruiter_fee_manual: d.recruiter_fee_manual ?? rawFloat("recruiter_fee_manual"),
        // Screening & hiring
        screening_questions: d.screening_questions ?? rawJson("screening_questions"),
        interview_type: d.interview_type ?? rawOrNull("interview_type"),
        num_interviews: d.num_interviews ?? rawInt("num_interviews"),
        interview_conductors: d.interview_conductors ?? rawOrNull("interview_conductors"),
        technical_test_required: d.technical_test_required ?? rawBool("technical_test_required"),
        assessment_type: d.assessment_type ?? rawOrNull("assessment_type"),
        // Working conditions
        working_hours: d.working_hours ?? rawOrNull("working_hours"),
        flexible_hours: d.flexible_hours ?? rawBool("flexible_hours"),
        shift_work: d.shift_work ?? rawOrNull("shift_work"),
        shift_timings: d.shift_timings ?? rawOrNull("shift_timings"),
        overtime_policy: d.overtime_policy ?? rawOrNull("overtime_policy"),
        // Timeline
        desired_start_date: d.desired_start_date || rawOrNull("desired_start_date"),
        urgency_level: d.urgency_level ?? rawOrNull("urgency_level"),
        // Other
        travel_required: d.travel_required ?? rawOrNull("travel_required"),
        background_check_required: d.background_check_required ?? rawBool("background_check_required"),
        // Pipeline & status — non-draft jobs go to pending_approval (Step 4 of process flow);
        // Recruito admin must approve before recruiters see them (sets status='active' + published_at).
        pipeline_stages: pipelineStages,
        status: isDraft ? "draft" : "pending_approval",
    };

    const { data: jobData, error: jobError } = existingDraftId
        ? await supabase.from("jobs").update(jobPayload).eq("id", existingDraftId).eq("status", "draft").select("id").single()
        : await supabase.from("jobs").insert(jobPayload).select("id").single();

    if (jobError) {
        console.error("Error creating job:", jobError);
        return { error: "Something went wrong. Please try again." };
    }

    if (isDraft) {
        return { success: true, jobId: jobData?.id };
    }

    // Job is now pending_approval — recruiters are notified later in approveJob().

    revalidatePath("/company");
    revalidatePath("/company/jobs");
    redirect("/company/jobs");
}

// Notify matching approved recruiters about a job. Called from approveJob() once admin
// has activated the listing (Step 4 of the recruitment process flow).
async function notifyMatchingRecruitersAboutJob(jobId: string) {
    try {
        const supabase = await createClient();

        const { data: job } = await supabase
            .from("jobs")
            .select("title, industry, location, country, fee_percentage, company_id")
            .eq("id", jobId)
            .single();

        if (!job) return;

        const { data: company } = await supabase
            .from("companies")
            .select("company_name")
            .eq("id", job.company_id)
            .single();

        const { data: allApprovedRecruiters } = await supabase
            .from("recruiters")
            .select(`
                id,
                user_id,
                primary_industries,
                specializations,
                locations,
                countries_experience,
                profiles:user_id (
                    email,
                    full_name
                )
            `)
            .eq("approval_status", "approved");

        const matchingRecruiters = (allApprovedRecruiters || []).filter((recruiter) => {
            const industryMatch =
                (recruiter.primary_industries?.includes(job.industry)) ||
                (recruiter.specializations?.includes(job.industry));
            const locationMatch =
                (recruiter.locations?.includes(job.country)) ||
                (recruiter.countries_experience?.includes(job.country));
            return industryMatch || locationMatch;
        });

        for (const recruiter of matchingRecruiters) {
            const profile = Array.isArray(recruiter.profiles)
                ? recruiter.profiles[0]
                : recruiter.profiles as any;

            if (!profile?.email) continue;

            const recruiterName = profile.full_name || "Recruiter";
            const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://recruito.com"}/recruiter/jobs/${jobId}`;

            await createNotification(recruiter.user_id, {
                titleKey: "notif.newJobTitle",
                bodyKey: "notif.newJobBody",
                params: { jobTitle: job.title, company: company?.company_name || "—" },
                link: `/recruiter/jobs/${jobId}`,
            });

            const emailHtml = newJobNotificationEmail({
                recruiterName,
                jobTitle: job.title,
                companyName: company?.company_name || "Partner Company",
                location: job.location || "Not specified",
                feePercentage: job.fee_percentage || 0,
                jobUrl,
            });

            await sendUserEmail({
                to: profile.email,
                subject: `New job: ${job.title}`,
                html: emailHtml,
            });
        }
    } catch (error) {
        console.error("Error notifying recruiters about new job:", error);
        // Don't fail approval if notification fails
    }
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
      candidates:candidates(recruito_screened_at, recruiter_id),
      mandates:job_mandates(recruiter_id)
    `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

    return jobs?.map((job) => ({
        ...job,
        // "Recruiters" = DISTINCT recruiters working the job who have NOT delivered
        // a candidate (delivered ones show up in the Candidates column). Expired-
        // without-delivery recruiters still count. We pass the mandate rows'
        // recruiter_ids (not a raw row count) so duplicate/stale job_mandates rows
        // don't inflate the number. See countRecruitersWithoutDelivery.
        recruiters_count: countRecruitersWithoutDelivery(
            (job.mandates || []).map((m: any) => m.recruiter_id),
            job.candidates || [],
        ),
        // Only count candidates Recruito has presented & approved (recruito_screened_at
        // set). Drafts and not-yet-approved submissions stay hidden from the company —
        // same visibility gate the job-detail page applies.
        candidates_count: (job.candidates || []).filter((cand: any) => cand.recruito_screened_at).length,
    })) || [];
}

export async function updateJob(jobId: string, formData: FormData) {
    const { error: authError, supabase } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };

    // Verify job is still in draft status before allowing edits
    const { data: job } = await supabase
        .from("jobs")
        .select("status")
        .eq("id", jobId)
        .single();

    if (!job || job.status !== "draft") {
        return { error: "Only draft jobs can be edited" };
    }

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
        return { error: "Something went wrong. Please try again." };
    }

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/company/jobs");
    redirect(`/company/jobs/${jobId}`);
}

// notifyRecruitersOfJobLifecycleChange lives in "@/lib/job-fill" (a server-only,
// non-"use server" module) so it is not exposed as a public RPC endpoint.

export async function closeJob(jobId: string, reason?: string) {
    const { error: authError, supabase } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };

    const { data: job } = await supabase.from("jobs").select("status").eq("id", jobId).single();
    if (!job || (job.status !== "active" && job.status !== "paused")) {
        return { error: "Jobbet kan inte stängas från dess nuvarande status." };
    }

    const updatePayload: Record<string, unknown> = { status: 'closed' };
    if (reason) updatePayload.close_reason = reason;

    const { error } = await supabase
        .from("jobs")
        .update(updatePayload)
        .eq("id", jobId);

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Something went wrong. Please try again." };
    }

    // Closing the job auto-rejects every remaining non-hired candidate.
    await rejectRemainingCandidates(jobId);

    await notifyRecruitersOfJobLifecycleChange(jobId, "closed", reason);

    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/company/jobs");
}

export async function pauseJob(jobId: string, reason?: string) {
    const { error: authError, supabase } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };

    const { data: job } = await supabase.from("jobs").select("status").eq("id", jobId).single();
    if (!job || job.status !== "active") {
        return { error: "Endast aktiva jobb kan pausas." };
    }

    const { error } = await supabase
        .from("jobs")
        .update({ status: 'paused', pause_reason: reason ?? null })
        .eq("id", jobId);

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Something went wrong. Please try again." };
    }

    await notifyRecruitersOfJobLifecycleChange(jobId, "paused", reason);

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
        // Clear the pause reason and re-arm the "consider reopening" nudge.
        .update({ status: 'active', pause_reason: null, reopen_nudge_sent_at: null })
        .eq("id", jobId);

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Something went wrong. Please try again." };
    }

    await notifyRecruitersOfJobLifecycleChange(jobId, "reopened");

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

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Something went wrong. Please try again." };
    }

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
                await createNotification(userId, {
                    titleKey: "notif.pipelineUpdatedTitle",
                    bodyKey: "notif.pipelineUpdatedBody",
                    params: { jobTitle: job?.title },
                    link: `/recruiter/mandates`,
                });
            }
        }
    }

    revalidatePath(`/company/jobs/${jobId}`);
    return { success: true };
}

export async function createJobAnnouncement(jobId: string, message: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error: authError } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };

    const { error } = await supabase
        .from("job_announcements")
        .insert({ job_id: jobId, message, created_by: user.id });

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Something went wrong. Please try again." };
    }

    // Notify recruiters with mandates
    const { data: mandates } = await supabase
        .from("job_mandates")
        .select("recruiter:recruiters(user_id), job:jobs(title)")
        .eq("job_id", jobId)
        .eq("is_active", true);

    if (mandates) {
        for (const m of mandates) {
            const userId = (m.recruiter as any)?.user_id;
            const jobTitle = (m.job as any)?.title;
            if (userId) {
                await createNotification(userId, {
                    titleKey: "notif.newAnnouncementTitle",
                    bodyKey: "notif.newAnnouncementBody",
                    params: { jobTitle, message: `${message.slice(0, 100)}${message.length > 100 ? "…" : ""}` },
                    link: `/recruiter/mandates`,
                });
            }
        }
    }

    revalidatePath(`/company/jobs/${jobId}`);
    return { success: true };
}

export async function getJobAnnouncements(jobId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("job_announcements")
        .select("id, message, created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

    if (error) return [];
    return data || [];
}

export async function deleteDraftJob(jobId: string) {
    const { error: authError, supabase } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };

    const { data: job } = await supabase
        .from("jobs")
        .select("status")
        .eq("id", jobId)
        .single();

    if (!job || job.status !== "draft") {
        return { error: "Only draft assignments can be deleted." };
    }

    // Use admin client to bypass RLS and cascade-clean dependent rows
    // (mandates/announcements can block the delete with FK constraints).
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    // Clean up dependent records first. Abort if any cascade delete fails so we
    // don't leave a half-wiped draft (candidates/announcements gone, job kept).
    const cascade = await Promise.all([
        admin.from("candidates").delete().eq("job_id", jobId),
        admin.from("job_announcements").delete().eq("job_id", jobId),
        admin.from("job_mandates").delete().eq("job_id", jobId),
    ]);
    const cascadeError = cascade.find((r) => r.error)?.error;
    if (cascadeError) {
        console.error("[deleteDraftJob] cascade", cascadeError);
        return { error: "Could not delete draft. Please try again." };
    }

    const { error } = await admin.from("jobs").delete().eq("id", jobId);

    if (error) {
        console.error("[deleteDraftJob]", error);
        return { error: "Could not delete draft. Please try again." };
    }

    revalidatePath("/company/jobs");
    return { success: true };
}

// Step 4 of recruitment process flow: Recruito admin approves a pending job.
// Flips status pending_approval -> active, sets published_at, then notifies recruiters.
export async function approveJob(jobId: string) {
    const { supabase } = await requireAdmin();

    const { data: job } = await supabase
        .from("jobs")
        .select("status, client_fee_amount, client_fee_amount_estimated")
        .eq("id", jobId)
        .single();

    if (!job) return { error: "Job not found." };
    if (job.status !== "pending_approval") {
        return { error: "Job is not pending approval." };
    }
    if (
        job.client_fee_amount != null &&
        job.client_fee_amount_estimated != null &&
        Number(job.client_fee_amount) > Number(job.client_fee_amount_estimated)
    ) {
        return { error: "Fee has been increased above the original estimate. Use 'Approve & request client re-confirm' instead." };
    }

    const { data: updated, error } = await supabase
        .from("jobs")
        .update({ status: "active", published_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("status", "pending_approval")
        .select("id");

    if (error) {
        console.error("[approveJob]", error);
        return { error: "Could not approve job. Please try again." };
    }
    if (!updated || updated.length === 0) {
        return { error: "Job state changed; please refresh." };
    }

    // Fire-and-forget notifications to matching recruiters.
    await notifyMatchingRecruitersAboutJob(jobId);

    revalidatePath("/admin/jobs");
    revalidatePath("/recruiter/jobs");
    return { success: true };
}

// Company-side: accept the higher fee proposed during admin review. Status guard
// prevents race with admin withdraw or repeated client clicks. Reuses
// notifyMatchingRecruitersAboutJob since the job is now eligible for recruiters.
export async function clientApproveProposedFee(jobId: string) {
    const { error: authError, supabase, user } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };
    if (!user) return { error: "Ej inloggad" };

    const { data: job } = await supabase
        .from("jobs")
        .select("id, status, client_fee_amount_proposed, published_at, title")
        .eq("id", jobId)
        .single();
    if (!job) return { error: "Job not found" };
    if (job.status !== "pending_client_reconfirm") {
        return { error: "Job is no longer awaiting re-confirmation" };
    }
    if (job.client_fee_amount_proposed == null) {
        return { error: "No proposed amount on file" };
    }

    const { data: updated, error } = await supabase
        .from("jobs")
        .update({
            status: "active",
            client_fee_amount: job.client_fee_amount_proposed,
            client_fee_amount_proposed: null,
            client_fee_reconfirm_resolved_at: new Date().toISOString(),
            client_fee_reconfirm_decision: "approved",
            published_at: job.published_at ?? new Date().toISOString(),
        })
        .eq("id", jobId)
        .eq("status", "pending_client_reconfirm")
        .select("id");

    if (error) {
        console.error("[clientApproveProposedFee]", error);
        return { error: "Could not approve. Please try again." };
    }
    if (!updated || updated.length === 0) {
        return { error: "Job state changed; please refresh." };
    }

    await notifyMatchingRecruitersAboutJob(jobId);

    revalidatePath("/company/jobs");
    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/admin/jobs");
    return { success: true as const };
}

// Company-side: reject the higher fee. Routes back to pending_approval; admin
// can revise the fee or withdraw.
export async function clientRejectProposedFee(jobId: string) {
    const { error: authError, supabase, user } = await verifyJobOwnership(jobId);
    if (authError) return { error: authError };
    if (!user) return { error: "Ej inloggad" };

    const { data: job } = await supabase
        .from("jobs")
        .select("id, status")
        .eq("id", jobId)
        .single();
    if (!job) return { error: "Job not found" };
    if (job.status !== "pending_client_reconfirm") {
        return { error: "Job is no longer awaiting re-confirmation" };
    }

    const { data: updated, error } = await supabase
        .from("jobs")
        .update({
            status: "pending_approval",
            client_fee_amount_proposed: null,
            client_fee_uplift_reason: null,
            client_fee_uplift_note: null,
            client_fee_reconfirm_resolved_at: new Date().toISOString(),
            client_fee_reconfirm_decision: "rejected",
        })
        .eq("id", jobId)
        .eq("status", "pending_client_reconfirm")
        .select("id");

    if (error) {
        console.error("[clientRejectProposedFee]", error);
        return { error: "Could not reject. Please try again." };
    }
    if (!updated || updated.length === 0) {
        return { error: "Job state changed; please refresh." };
    }

    revalidatePath("/company/jobs");
    revalidatePath(`/company/jobs/${jobId}`);
    revalidatePath("/admin/jobs");
    return { success: true as const };
}
