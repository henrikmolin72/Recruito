"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Recruiter } from "@/types/db-types";
import { createNotification } from "@/lib/actions/notifications";
import { validateRecruiterProfileForm } from "@/lib/validation/forms";

function handleError(error: any) {
    console.error(error);
    if (error.message === "JWT_EXPIRED") {
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
        .single();

    if (recruiterError || !recruiter) {
        console.error("No recruiter profile found:", recruiterError);
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

    const totalRevenue = placements?.reduce((sum, p) => sum + p.recruiter_fee, 0) || 0;

    // 5. Get count of available jobs (active jobs not yet claimed by max recruiters)
    // This is a bit complex in one query, so we'll just get count of all active jobs for now
    const { count: availableJobsCount } = await supabase
        .from("jobs")
        .select("*", { count: 'exact', head: true })
        .eq("status", "active");

    // Format mandates for easier usage
    const formattedMandates = mandates?.map((mandate: any) => ({
        id: mandate.id,
        title: mandate.job?.title || "Okänt jobb",
        company: mandate.job?.company?.company_name || "Okänt företag",
        location: mandate.job?.location || "",
        status: mandate.job?.status || "active",
        candidates: 0 // Ideally we fetch count of candidates for this mandate
    })) || [];

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

    return availableJobs.map(job => ({
        ...job,
        company_name: job.company?.company_name || 'Okänt företag',
        recruiters_count: job.current_recruiter_count || 0
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
        candidates: mandate.candidates?.map((c: any) => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`,
            status: c.status
        })) || []
    }));
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
        company:companies(company_name)
      ),
      candidates:candidates(
        id,
        first_name,
        last_name,
        status,
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
            status: candidate.status,
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
        candidates,
    };
}
