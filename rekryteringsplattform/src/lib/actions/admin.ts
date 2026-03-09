"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notifications";

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.user_metadata?.role !== "admin") {
        redirect("/login");
    }
    return { supabase, user };
}

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) {
        return value[0] || null;
    }
    return value || null;
}

export async function getAdminStats() {
    const { supabase } = await requireAdmin();

    const [companies, recruiters, jobs, placements, pendingRecruiters] = await Promise.all([
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("recruiters").select("*", { count: "exact", head: true }),
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("placements").select("total_fee,platform_fee,recruiter_fee"),
        supabase.from("recruiters").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
    ]);

    const totalRevenue = placements.data?.reduce((sum, placement) => {
        const totalFee = placement.total_fee || 0;
        const recruiterFee = placement.recruiter_fee || 0;
        const platformFee = placement.platform_fee ?? (totalFee > 0 ? Math.max(totalFee - recruiterFee, 0) : 0);
        return sum + platformFee;
    }, 0) || 0;

    return {
        companies: companies.count || 0,
        recruiters: recruiters.count || 0,
        activeJobs: jobs.count || 0,
        pendingRecruiters: pendingRecruiters.count || 0,
        totalRevenue,
    };
}

export async function getAdminRecruiters() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
        .from("recruiters")
        .select(`
            id,
            user_id,
            headline,
            approval_status,
            rating,
            total_placements,
            years_experience,
            profile:profiles!recruiters_user_id_fkey (
                full_name,
                email,
                phone
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching recruiters:", error);
        return [];
    }

    return (data || []).map((r: any) => {
        const profile = pickFirst(r.profile);
        return {
            id: r.id,
            user_id: r.user_id,
            name: profile?.full_name || "Okänd",
            email: profile?.email || "",
            headline: r.headline || "",
            status: r.approval_status || "pending",
            rating: r.rating || 0,
            placements: r.total_placements || 0,
            years_experience: r.years_experience || 0,
        };
    });
}

export async function approveRecruiter(recruiterId: string) {
    const { user } = await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data: recruiter } = await supabaseAdmin
        .from("recruiters")
        .select("user_id")
        .eq("id", recruiterId)
        .single();

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update({
            approval_status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: user.id,
        })
        .eq("id", recruiterId);

    if (error) return { error: error.message };

    if (recruiter?.user_id) {
        await createNotification(
            recruiter.user_id,
            "Din profil har godkänts!",
            "Grattis! Din rekryterarprofil har godkänts. Du kan nu ta uppdrag och presentera kandidater.",
            "/recruiter/jobs"
        );
    }

    revalidatePath("/admin");
    revalidatePath("/admin/recruiters");
    revalidatePath("/recruiter");
    revalidatePath("/recruiter/jobs");
    revalidatePath("/recruiter/profile");
    return { success: true };
}

export async function rejectRecruiter(recruiterId: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data: recruiter } = await supabaseAdmin
        .from("recruiters")
        .select("user_id")
        .eq("id", recruiterId)
        .single();

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update({
            approval_status: "rejected",
            approved_at: null,
            approved_by: null,
        })
        .eq("id", recruiterId);

    if (error) return { error: error.message };

    if (recruiter?.user_id) {
        await createNotification(
            recruiter.user_id,
            "Din ansökan har avslagits",
            "Tyvärr har din rekryterarprofil avslagits. Kontakta oss om du har frågor.",
            "/recruiter/profile"
        );
    }

    revalidatePath("/admin");
    revalidatePath("/admin/recruiters");
    revalidatePath("/recruiter/profile");
    return { success: true };
}

export async function suspendRecruiter(recruiterId: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data: recruiter } = await supabaseAdmin
        .from("recruiters")
        .select("user_id")
        .eq("id", recruiterId)
        .single();

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update({
            approval_status: "suspended",
            approved_at: null,
            approved_by: null,
        })
        .eq("id", recruiterId);

    if (error) return { error: error.message };

    if (recruiter?.user_id) {
        await createNotification(
            recruiter.user_id,
            "Ditt konto har suspenderats",
            "Ditt rekryterarkonto har suspenderats. Kontakta oss för mer information.",
            "/recruiter/profile"
        );
    }

    revalidatePath("/admin/recruiters");
    revalidatePath("/recruiter/profile");
    revalidatePath("/recruiter/jobs");
    return { success: true };
}

export async function getAdminCompanies() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
        .from("companies")
        .select(`
            id,
            company_name,
            org_number,
            industry,
            profile:profiles!companies_user_id_fkey (
                full_name,
                email
            ),
            jobs:jobs (count)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching companies:", error);
        return [];
    }

    return (data || []).map((company: any) => {
        const profile = pickFirst(company.profile);
        return {
            id: company.id,
            name: company.company_name || "Okänt företag",
            org_number: company.org_number || "",
            industry: company.industry || "",
            contact: profile?.full_name || "",
            email: profile?.email || "",
            jobs: company.jobs?.[0]?.count || 0,
        };
    });
}

export async function getAdminJobs() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
        .from("jobs")
        .select(`
            id,
            title,
            location,
            salary_min,
            status,
            current_recruiter_count,
            max_recruiters,
            company:companies (company_name),
            candidates:candidates (count)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching jobs:", error);
        return [];
    }

    return (data || []).map((job: any) => {
        const company = pickFirst(job.company);
        return {
            id: job.id,
            title: job.title,
            company: company?.company_name || "Okänt",
            location: job.location || "",
            salary: job.salary_min,
            status: job.status,
            recruiters: job.current_recruiter_count || 0,
            maxRecruiters: job.max_recruiters || 5,
            candidates: job.candidates?.[0]?.count || 0,
        };
    });
}

export async function getAdminPlacements() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
        .from("placements")
        .select(`
            id,
            total_fee,
            platform_fee,
            recruiter_fee,
            status,
            start_date,
            guarantee_end_date,
            invoice_sent_at,
            payment_received_at,
            payout_released_at,
            guarantee_failed_at,
            guarantee_failed_reason,
            refund_amount,
            completed_at,
            created_at,
            candidate:candidates (first_name, last_name),
            job:jobs (title),
            company:companies (company_name),
            recruiter:recruiters (
                profile:profiles!recruiters_user_id_fkey (full_name)
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching placements:", error);
        return [];
    }

    return (data || []).map((placement: any) => {
        const candidate = pickFirst(placement.candidate);
        const job = pickFirst(placement.job);
        const company = pickFirst(placement.company);
        const recruiter = pickFirst(placement.recruiter);
        const recruiterProfile = pickFirst(recruiter?.profile);
        const totalFee = placement.total_fee || ((placement.platform_fee || 0) + (placement.recruiter_fee || 0));

        return {
            id: placement.id,
            job: job?.title || "Okänt",
            company: company?.company_name || "Okänt",
            recruiter: recruiterProfile?.full_name || "Okänd",
            candidate: candidate ? `${candidate.first_name} ${candidate.last_name}` : "Okänd",
            totalFee,
            platformFee: placement.platform_fee ?? Math.max(totalFee - (placement.recruiter_fee || 0), 0),
            recruiterFee: placement.recruiter_fee ?? Math.max(totalFee - (placement.platform_fee || 0), 0),
            status: placement.status,
            date: placement.created_at,
            guaranteeEndDate: placement.guarantee_end_date,
            invoiceSentAt: placement.invoice_sent_at,
            paymentReceivedAt: placement.payment_received_at,
        };
    });
}

export async function getPendingRecruiters() {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
        .from("recruiters")
        .select(`
            id,
            headline,
            years_experience,
            created_at,
            profile:profiles!recruiters_user_id_fkey (
                full_name,
                email
            )
        `)
        .eq("approval_status", "pending")
        .order("created_at", { ascending: true });

    if (error) return [];

    return (data || []).map((r: any) => {
        const profile = pickFirst(r.profile);
        return {
            id: r.id,
            name: profile?.full_name || "Okänd",
            email: profile?.email || "",
            headline: r.headline || "",
            years_experience: r.years_experience || 0,
            applied: r.created_at,
        };
    });
}
