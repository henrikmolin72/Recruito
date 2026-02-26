"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Recruiter } from "@/types/db-types";
import { createNotification } from "@/lib/actions/notifications";
import { validateRecruiterOnboardingProfileForm, validateRecruiterProfileForm } from "@/lib/validation/forms";
import { sendInternalRecruiterEmail } from "@/lib/email/internal-notifications";

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
    console.error("Recruiter action error:", normalized);
    if (error?.message === "JWT_EXPIRED") {
        redirect("/login");
    }
    throw new Error("Kunde inte hämta data");
}

export async function getRecruiterProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const { data: recruiter } = await supabase.from("recruiters").select("*").eq("user_id", user.id).single();

    return { profile, recruiter };
}

export async function updateRecruiterProfile(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Ej inloggad" };

    const parsed = validateRecruiterProfileForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    const profileUpdates: Record<string, string | null> = {};
    if (parsed.data.full_name) {
        profileUpdates.full_name = parsed.data.full_name;
    }
    if (parsed.data.phone !== undefined) {
        profileUpdates.phone = parsed.data.phone;
    }

    if (Object.keys(profileUpdates).length > 0) {
        await supabase.from("profiles").update(profileUpdates).eq("id", user.id);
    }

    const { error } = await supabase
        .from("recruiters")
        .update({
            headline: parsed.data.headline,
            bio: parsed.data.bio,
            linkedin_url: parsed.data.linkedin_url,
        })
        .eq("user_id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/recruiter/profile");
    return { success: true };
}

export async function completeRecruiterOnboarding(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Ej inloggad" };

    const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id, current_country, experience_bracket, years_experience, linkedin_url")
        .eq("user_id", user.id)
        .single();

    if (!recruiter) {
        return { error: "Rekryterarprofil saknas" };
    }

    const parsed = validateRecruiterOnboardingProfileForm(formData);
    if (!parsed.success) {
        return { error: parsed.error };
    }

    let avatarUrl: string | null = null;
    const photo = formData.get("photo");
    if (photo instanceof File && photo.size > 0) {
        const ext = photo.name.split(".").pop() || "jpg";
        const fileName = `recruiters/${recruiter.id}/avatar-${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("cvs")
            .upload(fileName, photo, { upsert: true });

        if (uploadError) {
            console.error("Recruiter photo upload error:", uploadError);
            return { error: "Kunde inte ladda upp profilfoto." };
        }

        avatarUrl = uploadData?.path || null;
    }

    const { error: recruiterUpdateError } = await supabase
        .from("recruiters")
        .update({
            primary_industries: parsed.data.primary_industries,
            primary_industries_other: parsed.data.primary_industries_other,
            countries_experience: parsed.data.countries_experience,
            languages_spoken: parsed.data.languages_spoken,
            seniority_focus: parsed.data.seniority_focus,
            roles_per_week: parsed.data.roles_per_week,
            candidates_sourced_last_12m: parsed.data.candidates_sourced_last_12m,
            successful_placements_last_12m: parsed.data.successful_placements_last_12m,
            average_time_to_fill: parsed.data.average_time_to_fill,
            challenging_role_example: parsed.data.challenging_role_example,
            sourcing_channels: parsed.data.sourcing_channels,
            sourcing_channels_other: parsed.data.sourcing_channels_other,
            available_hours_per_week: parsed.data.available_hours_per_week,
            onboarding_completed_at: new Date().toISOString(),
            onboarding_email_sent_at: new Date().toISOString(),
        })
        .eq("id", recruiter.id);

    if (recruiterUpdateError) {
        console.error("Recruiter onboarding update error:", recruiterUpdateError);
        return { error: recruiterUpdateError.message };
    }

    if (avatarUrl) {
        const { error: profileError } = await supabase
            .from("profiles")
            .update({ avatar_url: avatarUrl })
            .eq("id", user.id);

        if (profileError) {
            console.error("Recruiter onboarding avatar profile update error:", profileError);
        }
    }

    try {
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
        await sendInternalRecruiterEmail({
            subject: `Recruiter onboarding completed: ${profile?.full_name || user.id}`,
            text: [
                "Recruiter profile completion form inkom.",
                "",
                `Namn: ${profile?.full_name || "—"}`,
                `E-post: ${profile?.email || "—"}`,
                `Land: ${recruiter.current_country || "—"}`,
                `LinkedIn: ${recruiter.linkedin_url || "—"}`,
                `Erfarenhet: ${recruiter.experience_bracket || recruiter.years_experience || "—"}`,
                `Primary industries: ${parsed.data.primary_industries.join(", ")}`,
                `Primary industries other: ${parsed.data.primary_industries_other || "—"}`,
                `Countries experience: ${parsed.data.countries_experience.join(", ")}`,
                `Languages: ${parsed.data.languages_spoken.map((l: any) => `${l.language} (${l.proficiency})`).join(", ")}`,
                `Seniority focus: ${parsed.data.seniority_focus.join(", ")}`,
                `Roles/week: ${parsed.data.roles_per_week}`,
                `Candidates sourced 12m: ${parsed.data.candidates_sourced_last_12m}`,
                `Placements 12m: ${parsed.data.successful_placements_last_12m}`,
                `Average time to fill: ${parsed.data.average_time_to_fill}`,
                `Challenging role: ${parsed.data.challenging_role_example}`,
                `Sourcing channels: ${parsed.data.sourcing_channels.join(", ")}`,
                `Sourcing channels other: ${parsed.data.sourcing_channels_other || "—"}`,
                `Available hours/week: ${parsed.data.available_hours_per_week}`,
                `Photo uploaded: ${avatarUrl ? "Ja" : "Nej"}`,
                "",
                `Recruiter ID: ${recruiter.id}`,
                `User ID: ${user.id}`,
            ].join("\n"),
        });
    } catch (mailError) {
        console.error("Failed to send recruiter onboarding completion email:", mailError);
    }

    revalidatePath("/recruiter/profile");
    revalidatePath("/recruiter");
    return { success: true };
}

export async function getRecruiterCandidates() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: recruiter } = await supabase.from("recruiters").select("id").eq("user_id", user.id).single();
    if (!recruiter) return [];

    const { data, error } = await supabase
        .from("candidates")
        .select(`
            *,
            job:jobs (
                id,
                title,
                company:companies (company_name)
            )
        `)
        .eq("recruiter_id", recruiter.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching recruiter candidates:", error);
        return [];
    }

    return data || [];
}

export async function getRecruiterEarnings() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { placements: [], stats: { total: 0, paid: 0, guarantee: 0 } };

    const { data: recruiter } = await supabase.from("recruiters").select("id").eq("user_id", user.id).single();
    if (!recruiter) return { placements: [], stats: { total: 0, paid: 0, guarantee: 0 } };

    const { data: placements, error } = await supabase
        .from("placements")
        .select(`
            *,
            candidate:candidates (first_name, last_name),
            job:jobs (title),
            company:companies (company_name)
        `)
        .eq("recruiter_id", recruiter.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching earnings:", error);
        return { placements: [], stats: { total: 0, paid: 0, guarantee: 0 } };
    }

    const data = placements || [];
    const total = data.reduce((sum: number, p: any) => sum + (p.recruiter_fee || 0), 0);
    const paid = data.filter((p: any) => p.status === "payout_released" || p.status === "payment_received").reduce((sum: number, p: any) => sum + (p.recruiter_fee || 0), 0);
    const guarantee = data.filter((p: any) => p.status === "guarantee_active").reduce((sum: number, p: any) => sum + (p.recruiter_fee || 0), 0);

    return { placements: data, stats: { total, paid, guarantee } };
}

export async function getRecruiterDashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // 1. Get recruiter profile
    const { data: recruiter, error: recruiterError } = await supabase
        .from("recruiters")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    if (recruiterError || !recruiter) {
        if (recruiterError) {
            console.error("Error loading recruiter profile for dashboard:", {
                message: recruiterError.message,
                code: (recruiterError as any).code,
                details: (recruiterError as any).details,
                hint: (recruiterError as any).hint,
            });
        }
        return {
            recruiter: { user_id: user.id } as Recruiter,
            mandates: [],
            stats: { activeMandates: 0, revenue: 0, candidates: 0, availableJobs: 0 },
            recentActivity: [],
            userName: user.user_metadata.full_name
        };
    }

    // 2. Get active mandates (jobs claimed by recruiter)
    const { data: mandates, error: mandatesError } = await supabase
        .from("job_mandates")
        .select(`
      *,
      job:jobs(
        *,
        company:companies(company_name)
      )
    `)
        .eq("recruiter_id", recruiter.id)
        .eq("is_active", true);

    if (mandatesError) {
        handleError(mandatesError);
    }

    // 3. Get candidates submitted by this recruiter
    const { count: candidatesCount } = await supabase
        .from("candidates")
        .select("*", { count: 'exact', head: true })
        .eq("recruiter_id", recruiter.id);

    // 4. Get total placements/revenue
    const { data: placements } = await supabase
        .from("placements")
        .select("recruiter_fee")
        .eq("recruiter_id", recruiter.id);

    const totalRevenue = placements?.reduce((sum, p) => sum + (p.recruiter_fee || 0), 0) || 0;

    // 5. Get count of available jobs (active jobs not yet claimed by max recruiters)
    // This is a bit complex in one query, so we'll just get count of all active jobs for now
    const { count: availableJobsCount } = await supabase
        .from("jobs")
        .select("*", { count: 'exact', head: true })
        .eq("status", "active");

    // Format mandates for easier usage
    const formattedMandates = mandates?.map((mandate: any) => {
        const job = Array.isArray(mandate.job) ? mandate.job[0] : mandate.job;
        const company = Array.isArray(job?.company) ? job.company[0] : job?.company;
        return {
            id: mandate.id,
            title: job?.title || "Okänt jobb",
            company: company?.company_name || "Okänt företag",
            location: job?.location || "",
            status: job?.status || "active",
            candidates: 0 // Ideally we fetch count of candidates for this mandate
        };
    }) || [];

    // Fetch candidates count for each mandate separately to keep it simple, or leave as 0 for initial
    // Or do a joined query above. Let's do a simple loop for now as mandates are few per recruiter usually
    for (const m of formattedMandates) {
        const { count } = await supabase
            .from("candidates")
            .select("*", { count: 'exact', head: true })
            .eq("mandate_id", m.id);
        m.candidates = count || 0;
    }

    return {
        recruiter: recruiter,
        userName: user.user_metadata.full_name,
        mandates: formattedMandates,
        stats: {
            activeMandates: mandates?.length || 0,
            candidates: candidatesCount || 0,
            availableJobs: availableJobsCount || 0,
            revenue: totalRevenue
        },
        recentActivity: [] // Placeholder
    };
}

export async function getAvailableJobsForRecruiter() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!recruiter) return [];

    const { data: claimedMandates } = await supabase
        .from("job_mandates")
        .select("job_id")
        .eq("recruiter_id", recruiter.id);

    const claimedJobIds = claimedMandates?.map(m => m.job_id) || [];

    const { data: jobs, error } = await supabase
        .from("jobs")
        .select(`
      *,
      company:companies(company_name),
      mandates:job_mandates(count)
    `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching jobs:", error);
        return [];
    }

    const availableJobs = jobs.filter(job => {
        const isClaimed = claimedJobIds.includes(job.id);
        const recruitersCount = job.current_recruiter_count || 0;
        const isFull = recruitersCount >= job.max_recruiters;
        return !isClaimed && !isFull;
    });

    return availableJobs.map(job => {
        const company = Array.isArray(job.company) ? job.company[0] : job.company;
        return {
            ...job,
            company_name: company?.company_name || 'Okänt företag',
            recruiters_count: job.current_recruiter_count || 0
        };
    });
}

export async function claimMandate(jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id, approval_status")
        .eq("user_id", user.id)
        .single();

    if (!recruiter) {
        return { error: "Ingen rekryterarprofil hittades" };
    }

    if (recruiter.approval_status !== "approved") {
        return { error: "Din profil måste vara godkänd av admin innan du kan ta mandat" };
    }

    const { data: job } = await supabase
        .from("jobs")
        .select("status, current_recruiter_count, max_recruiters")
        .eq("id", jobId)
        .single();

    if (!job || job.status !== 'active') {
        return { error: "Jobbet är inte tillgängligt" };
    }

    if ((job.current_recruiter_count || 0) >= job.max_recruiters) {
        return { error: "Uppdraget är redan fullsatt" };
    }

    const { error: mandateError } = await supabase
        .from("job_mandates")
        .insert({
            job_id: jobId,
            recruiter_id: recruiter.id,
            is_active: true
        });

    if (mandateError) {
        if (mandateError.code === '23505') {
            return { error: "Du har redan tagit detta uppdrag" };
        }
        console.error("Error claiming mandate:", mandateError);
        return { error: mandateError.message };
    }

    revalidatePath("/recruiter/jobs");
    revalidatePath("/recruiter");

    // Notification: Notify Company Owner
    const { data: jobInfo } = await supabase
        .from("jobs")
        .select(`
            title,
            company:companies!inner (
                user_id
            )
        `)
        .eq("id", jobId)
        .single();

    if (jobInfo?.company) {
        const company = Array.isArray(jobInfo.company) ? jobInfo.company[0] : jobInfo.company;
        const targetUserId = company?.user_id;

        if (targetUserId) {
            await createNotification(
                targetUserId,
                "Ny rekryterare på uppdraget!",
                `En rekryterare har tagit ditt uppdrag: ${jobInfo.title}`,
                `/company/jobs/${jobId}`
            );
        }
    }

    return { success: true };
}

export async function getRecruiterMandates() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!recruiter) return [];

    const { data: mandates, error } = await supabase
        .from("job_mandates")
        .select(`
      id,
      is_active,
      job:jobs(
        id,
        title,
        description,
        location,
        industry,
        employment_type,
        salary_min,
        salary_max,
        salary_currency,
        fee_percentage,
        status,
        company:companies(company_name)
      ),
      candidates:candidates(
        id,
        first_name,
        last_name,
        status
      )
    `)
        .eq("recruiter_id", recruiter.id)
        .eq("is_active", true);

    if (error) {
        console.error("Error fetching mandates:", error);
        return [];
    }

    return mandates.map((mandate: any) => {
        const job = Array.isArray(mandate.job) ? mandate.job[0] : mandate.job;
        const company = Array.isArray(job?.company) ? job.company[0] : job?.company;
        return {
        id: mandate.id,
        job_id: job?.id,
        title: job?.title || "Okänt jobb",
        description: job?.description || "",
        company: company?.company_name || "Okänt företag",
        location: job?.location || "",
        industry: job?.industry || "",
        employment_type: job?.employment_type || "",
        salary_min: job?.salary_min,
        salary_max: job?.salary_max,
        salary_currency: job?.salary_currency || "SEK",
        fee_percentage: job?.fee_percentage,
        status: job?.status || "active",
        candidates: mandate.candidates?.map((c: any) => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`,
            status: c.status
        })) || []
    };
    });
}

export async function getRecruiterMandateById(mandateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!recruiter) return null;

    const { data: mandate, error } = await supabase
        .from("job_mandates")
        .select(`
      id,
      is_active,
      claimed_at,
      job:jobs(
        id,
        title,
        description,
        location,
        industry,
        employment_type,
        salary_min,
        salary_max,
        salary_currency,
        fee_percentage,
        status,
        pipeline_stages,
        company:companies(company_name)
      ),
      candidates:candidates(
        id,
        first_name,
        last_name,
        status,
        current_pipeline_stage,
        created_at
      )
    `)
        .eq("id", mandateId)
        .eq("recruiter_id", recruiter.id)
        .eq("is_active", true)
        .single();

    if (error || !mandate) {
        return null;
    }

    const job = Array.isArray(mandate.job) ? mandate.job[0] : mandate.job;
    const company = Array.isArray(job?.company) ? job.company[0] : job?.company;
    const candidates = (mandate.candidates || [])
        .slice()
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((candidate: any) => ({
            id: candidate.id,
            name: `${candidate.first_name} ${candidate.last_name}`,
            first_name: candidate.first_name,
            last_name: candidate.last_name,
            status: candidate.status,
            current_pipeline_stage: candidate.current_pipeline_stage,
            created_at: candidate.created_at,
        }));

    return {
        id: mandate.id,
        claimed_at: mandate.claimed_at,
        is_active: mandate.is_active,
        job_id: job?.id,
        title: job?.title || "Okänt jobb",
        description: job?.description || "",
        company: company?.company_name || "Okänt företag",
        location: job?.location || "",
        industry: job?.industry || "",
        employment_type: job?.employment_type || "",
        salary_min: job?.salary_min,
        salary_max: job?.salary_max,
        salary_currency: job?.salary_currency || "SEK",
        fee_percentage: job?.fee_percentage,
        status: job?.status || "active",
        pipeline_stages: (job as any)?.pipeline_stages || [],
        candidates,
    };
}

export async function getRecruiterApplicationsForJob(jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!recruiter) return [];

    const { data: mandate } = await supabase
        .from("job_mandates")
        .select("id")
        .eq("job_id", jobId)
        .eq("recruiter_id", recruiter.id)
        .eq("is_active", true)
        .maybeSingle();

    if (!mandate) return [];

    const { data: applications, error: applicationsError } = await supabase
        .from("applications")
        .select("id, job_id, recruiter_id, full_name, email, status, source, created_at")
        .eq("job_id", jobId)
        .eq("recruiter_id", recruiter.id)
        .order("created_at", { ascending: false });

    if (applicationsError) {
        console.error("Error fetching recruiter applications:", applicationsError);
        return [];
    }

    const applicationIds = (applications || []).map((app: any) => app.id);
    if (applicationIds.length === 0) return [];

    const { data: screenings, error: screeningsError } = await supabase
        .from("ai_screenings")
        .select("application_id, match_score, analysis_json, status, screened_at, error_message")
        .in("application_id", applicationIds);

    if (screeningsError) {
        console.error("Error fetching AI screenings for recruiter applications:", screeningsError);
    }

    const screeningMap: Record<string, any> = {};
    (screenings || []).forEach((row: any) => {
        let analysis = row.analysis_json || {};
        if (typeof analysis === "string") {
            try {
                analysis = JSON.parse(analysis);
            } catch {
                analysis = {};
            }
        }

        screeningMap[row.application_id] = {
            status: row.status || null,
            screened_at: row.screened_at || null,
            error_message: row.error_message || null,
            score: typeof row.match_score === "number" ? row.match_score : Number(row.match_score || 0),
            reasoning: Array.isArray(analysis?.reasoning) ? analysis.reasoning : [],
            missingSkills: Array.isArray(analysis?.missingSkills) ? analysis.missingSkills : [],
        };
    });

    return (applications || []).map((app: any) => ({
        ...app,
        screening: screeningMap[app.id] || null,
    }));
}
