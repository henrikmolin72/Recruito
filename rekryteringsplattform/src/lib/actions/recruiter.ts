"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Recruiter } from "@/types/db-types";
import { createNotification } from "@/lib/notifications/create";
import { validateRecruiterOnboardingProfileForm, validateRecruiterProfileForm } from "@/lib/validation/forms";
import { sendInternalRecruiterEmail } from "@/lib/email/internal-notifications";
import { candidateInStage } from "@/lib/mandate-stages";
import { isCandidateInProcess, countCandidatesAgainstCap } from "@/lib/candidate-workflow";
import { releaseDueMandates } from "@/lib/mandate-expiry-release";
import { verifyImageFileContent } from "@/lib/file-magic";

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

    const [{ data: profile }, { data: recruiter }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("recruiters").select("*").eq("user_id", user.id).single(),
    ]);

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

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Something went wrong. Please try again." };
    }

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
        // Validate profile photo: size, extension, declared MIME, and content
        // (CLAUDE.md §6). Blocks SVG/script payloads in the shared cvs bucket.
        if (photo.size > 5 * 1024 * 1024) return { error: "Profilfoto får vara högst 5 MB." };
        const ext = (photo.name.split(".").pop() || "").toLowerCase();
        const ALLOWED_IMG_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
        const ALLOWED_IMG_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
        const photoMime = (photo.type || "").toLowerCase();
        if (!ALLOWED_IMG_EXT.has(ext)) return { error: "Tillåtna bildformat: JPG, PNG, WEBP." };
        if (photoMime && !ALLOWED_IMG_MIME.has(photoMime)) return { error: "Tillåtna bildformat: JPG, PNG, WEBP." };
        if (!(await verifyImageFileContent(photo, ext))) {
            return { error: "Bildfilen är ogiltig eller skadad." };
        }
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
        return { error: "Something went wrong. Please try again." };
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
            userName: user.user_metadata?.full_name
        };
    }

    // 2-5. Independent reads run in parallel: mandates, candidate count,
    // placements/revenue, and available-jobs count.
    const [
        { data: mandates, error: mandatesError },
        { count: candidatesCount },
        { data: placements },
        { count: availableJobsCount },
    ] = await Promise.all([
        supabase
            .from("job_mandates")
            .select(`
      *,
      job:jobs(
        *,
        company:companies(company_name)
      )
    `)
            .eq("recruiter_id", recruiter.id)
            .eq("is_active", true),
        supabase
            .from("candidates")
            .select("*", { count: 'exact', head: true })
            .eq("recruiter_id", recruiter.id),
        supabase
            .from("placements")
            .select("recruiter_fee")
            .eq("recruiter_id", recruiter.id),
        supabase
            .from("jobs")
            .select("*", { count: 'exact', head: true })
            .eq("status", "active"),
    ]);

    if (mandatesError) {
        handleError(mandatesError);
    }

    const totalRevenue = placements?.reduce((sum, p) => sum + (p.recruiter_fee || 0), 0) || 0;

    // Format mandates for easier usage
    const formattedMandates = mandates?.map((mandate: any) => ({
        id: mandate.id,
        title: mandate.job?.title || "Okänt jobb",
        company: mandate.job?.company?.company_name || "Okänt företag",
        location: mandate.job?.location || "",
        status: mandate.job?.status || "active",
        candidates: 0
    })) || [];

    // Candidate counts per mandate in a single query, tallied in memory
    // (replaces a per-mandate N+1 loop).
    if (formattedMandates.length > 0) {
        const mandateIds = formattedMandates.map((m) => m.id);
        const { data: mandateCandidates } = await supabase
            .from("candidates")
            .select("mandate_id")
            .in("mandate_id", mandateIds);
        const countByMandate = new Map<string, number>();
        for (const row of mandateCandidates || []) {
            countByMandate.set(row.mandate_id, (countByMandate.get(row.mandate_id) ?? 0) + 1);
        }
        for (const m of formattedMandates) {
            m.candidates = countByMandate.get(m.id) ?? 0;
        }
    }

    return {
        recruiter: recruiter,
        userName: user.user_metadata?.full_name,
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

    // Use admin client for the listing aggregate: recruiter is auth'd above and
    // we only expose non-PII counts (pending candidate count per job). RLS on
    // `candidates` would otherwise silently return [] and break the count.
    const adminClient = createAdminClient();
    const { data: jobs, error } = await adminClient
        .from("jobs")
        .select(`
      *,
      company:companies(company_name),
      candidates:candidates(status)
    `)
        // Recruiters only discover jobs they can act on. Closed/filled/cancelled
        // jobs are terminal and not claimable, so they are excluded from Browse;
        // paused jobs stay visible (a company may resume them).
        .in("status", ["active", "paused"])
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching jobs:", error);
        return [];
    }

    const jobIds = (jobs || []).map((j: any) => j.id);

    // Free slots held by expired mandates BEFORE counting. Expiry normally flips
    // is_active=false via the daily cron; reconciling here keeps the marketplace
    // slot counts (and the claim_mandate capacity RPC) correct even when the cron
    // lags or a mandate was notified-but-not-released. No-op when nothing is due.
    await releaseDueMandates(adminClient, { jobIds });

    // The current recruiter's own claims — fetched AFTER reconciliation so a
    // just-released expired mandate correctly returns its job to the available list.
    const { data: claimedMandates } = await supabase
        .from("job_mandates")
        .select("job_id, is_active")
        .eq("recruiter_id", recruiter.id);

    const activeClaimedJobIds = new Set(
        (claimedMandates || []).filter(m => m.is_active).map(m => m.job_id)
    );
    const everClaimedJobIds = new Set((claimedMandates || []).map(m => m.job_id));

    // Slots taken = ACTIVE mandate rows only (post-reconciliation). Released rows
    // (expired past cycles) accumulate as history and must not count against capacity.
    const { data: activeMandateRows } = await adminClient
        .from("job_mandates")
        .select("job_id")
        .eq("is_active", true)
        .in("job_id", jobIds);

    const activeMandateCount = new Map<string, number>();
    for (const row of activeMandateRows || []) {
        activeMandateCount.set(row.job_id, (activeMandateCount.get(row.job_id) ?? 0) + 1);
    }
    const mandateCountOf = (job: any): number => activeMandateCount.get(job.id) ?? 0;

    const availableJobs = jobs.filter(job => {
        if (job.status !== "active") return true;
        // Full jobs stay visible (the card renders them as "Fullsatt" with no
        // claim action); only hide jobs this recruiter has already claimed —
        // those live under "My Mandates".
        return !activeClaimedJobIds.has(job.id);
    });

    return availableJobs.map(job => ({
        ...job,
        company_name: job.company?.company_name || 'Okänt företag',
        recruiters_count: mandateCountOf(job),
        worked_previously: everClaimedJobIds.has(job.id),
        // Candidates "in process" — shared predicate excludes terminal AND
        // hired-pipeline statuses (invoice_enabled etc. are not pending).
        pending_candidates_count: (job.candidates || []).filter(
            (c: { status: string | null }) => isCandidateInProcess(c.status),
        ).length,
    }));
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
        .select("status, max_recruiters, max_candidates")
        .eq("id", jobId)
        .single();

    if (!job || job.status !== 'active') {
        return { error: "Jobbet är inte tillgängligt" };
    }

    // Submission-capacity gate (covers retaking an expired job): there must be
    // room to submit at least one more candidate. Mirrors the submission cap in
    // createCandidateExtended — only candidates occupying a slot count toward
    // max_candidates (drafts excluded, rejected/withdrawn free their slot), counted
    // job-wide via the admin client so RLS can't undercount other recruiters' rows.
    const maxCandidates = (job as any).max_candidates ?? 8;
    const { data: capRows } = await createAdminClient()
        .from("candidates")
        .select("status")
        .eq("job_id", jobId);

    if (countCandidatesAgainstCap((capRows || []).map((c: any) => c.status)) >= maxCandidates) {
        return { error: "Uppdraget har nått sin kandidatgräns och kan inte tas just nu" };
    }

    // Atomic slot-cap claim: the claim_mandate RPC locks the job row, recounts
    // active mandates under the lock, and inserts — closing the check-then-insert
    // race where two recruiters could both exceed max_recruiters.
    const { data: result, error: claimError } = await supabase.rpc("claim_mandate", {
        p_job_id: jobId,
        p_recruiter_id: recruiter.id,
    });

    if (claimError) {
        console.error("Error claiming mandate:", claimError);
        return { error: "Something went wrong. Please try again." };
    }
    if (result === "full") {
        return { error: "Uppdraget är redan fullsatt" };
    }
    if (result === "already") {
        return { error: "Du har redan tagit detta uppdrag" };
    }
    if (result !== "ok") {
        // "notfound" or any unexpected value — surface a generic message.
        return { error: "Jobbet är inte tillgängligt" };
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
            await createNotification(targetUserId, {
                titleKey: "notif.newRecruiterTitle",
                bodyKey: "notif.newRecruiterBody",
                params: { jobTitle: jobInfo.title },
                link: `/company/jobs/${jobId}`,
            });
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
        published_at,
        application_deadline,
        max_candidates,
        company:companies(company_name)
      ),
      candidates:candidates(
        id,
        first_name,
        last_name,
        status,
        status_changed_at,
        recruito_screened_at
      )
    `)
        .eq("recruiter_id", recruiter.id)
        .eq("is_active", true);

    if (error) {
        console.error("Error fetching mandates:", error);
        return [];
    }

    return mandates.map((mandate: any) => ({
        id: mandate.id,
        job_id: mandate.job?.id,
        title: mandate.job?.title || "Okänt jobb",
        description: mandate.job?.description || "",
        company: mandate.job?.company?.company_name || "Okänt företag",
        location: mandate.job?.location || "",
        industry: mandate.job?.industry || "",
        employment_type: mandate.job?.employment_type || "",
        salary_min: mandate.job?.salary_min,
        salary_max: mandate.job?.salary_max,
        salary_currency: mandate.job?.salary_currency || "SEK",
        fee_percentage: mandate.job?.fee_percentage,
        status: mandate.job?.status || "active",
        claimed_at: mandate.claimed_at,
        application_deadline: mandate.job?.application_deadline,
        published_at: mandate.job?.published_at,
        max_candidates: mandate.job?.max_candidates ?? 8,
        submitted_count: (mandate.candidates || []).length,
        candidates: mandate.candidates?.map((c: any) => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`,
            status: c.status,
            status_changed_at: c.status_changed_at,
            recruito_screened_at: c.recruito_screened_at,
        })) || []
    }));
}

// Aggregate pipeline stats for a job across ALL recruiters' candidates, shown
// to any recruiter who opens the job so they can judge whether more candidates
// are needed. Counts only — no candidate PII. presented = process + interview + rejected.
export async function getJobProcessStats(jobId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("candidates")
        .select("status, recruito_screened_at")
        .eq("job_id", jobId);

    if (error) {
        console.error("[getJobProcessStats]", error);
        return null;
    }

    const candidates = data || [];
    const inInterview = candidates.filter(
        (c) => candidateInStage(c, "interview") || candidateInStage(c, "final_interview"),
    ).length;
    const rejected = candidates.filter((c) => candidateInStage(c, "rejected")).length;
    const presented = candidates.length;
    // Everything still in play that isn't an interview or a rejection.
    const inProcess = presented - inInterview - rejected;

    return { presented, inProcess, inInterview, rejected };
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
        client_fee_amount,
        is_exclusive,
        guarantee_period_months,
        max_candidates,
        status,
        pipeline_stages,
        company:companies(company_name)
      ),
      candidates:candidates(
        id,
        first_name,
        last_name,
        status,
        status_changed_at,
        current_pipeline_stage,
        recruito_screened_at,
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
            status_changed_at: candidate.status_changed_at,
            current_pipeline_stage: candidate.current_pipeline_stage,
            recruito_screened_at: candidate.recruito_screened_at,
            created_at: candidate.created_at,
        }));

    return {
        id: mandate.id,
        claimed_at: mandate.claimed_at,
        is_active: mandate.is_active,
        job_id: job?.id,
        recruiter_id: recruiter.id,
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
        client_fee_amount: (job as any)?.client_fee_amount ?? null,
        is_exclusive: !!(job as any)?.is_exclusive,
        guarantee_period_months: (job as any)?.guarantee_period_months ?? 0,
        status: job?.status || "active",
        max_candidates: (job as any)?.max_candidates ?? 8,
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
        .select("id, job_id, recruiter_id, full_name, email, phone, linkedin_url, status, source, screening_answers, consent_given, created_at")
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
