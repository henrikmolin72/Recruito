"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
        return value[0] ?? null;
    }
    return value ?? null;
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

export async function getAdminRecruiters(filters?: { status?: string; search?: string }) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin
        .from("recruiters")
        .select(`
            id,
            user_id,
            headline,
            approval_status,
            rejection_reason,
            rating,
            total_placements,
            years_experience,
            created_at,
            profile:profiles!recruiters_user_id_fkey (
                full_name,
                email,
                phone
            )
        `)
        .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "all") {
        query = query.eq("approval_status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching recruiters:", error);
        return [];
    }

    let results = (data || []).map((r: any) => {
        const profile = pickFirst(r.profile);
        return {
            id: r.id,
            user_id: r.user_id,
            name: profile?.full_name || "Okänd",
            email: profile?.email || "",
            phone: profile?.phone || "",
            headline: r.headline || "",
            status: r.approval_status || "pending",
            rejection_reason: r.rejection_reason || "",
            rating: r.rating || 0,
            placements: r.total_placements || 0,
            years_experience: r.years_experience || 0,
            created_at: r.created_at,
        };
    });

    // Client-side search filtering (matches name, email, headline)
    if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(r =>
            r.name.toLowerCase().includes(searchLower) ||
            r.email.toLowerCase().includes(searchLower) ||
            r.headline.toLowerCase().includes(searchLower)
        );
    }

    return results;
}

export async function approveRecruiter(recruiterId: string) {
    const { user } = await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update({
            approval_status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: user.id,
        })
        .eq("id", recruiterId);

    if (error) return { error: error.message };

    revalidatePath("/admin");
    revalidatePath("/admin/recruiters");
    revalidatePath("/recruiter");
    revalidatePath("/recruiter/jobs");
    revalidatePath("/recruiter/profile");
    return { success: true };
}

export async function rejectRecruiter(recruiterId: string, reason?: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update({
            approval_status: "rejected",
            approved_at: null,
            approved_by: null,
            rejection_reason: reason || null,
        })
        .eq("id", recruiterId);

    if (error) return { error: error.message };

    revalidatePath("/admin");
    revalidatePath("/admin/recruiters");
    revalidatePath("/recruiter/profile");
    return { success: true };
}

export async function suspendRecruiter(recruiterId: string) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update({
            approval_status: "suspended",
            approved_at: null,
            approved_by: null,
        })
        .eq("id", recruiterId);

    if (error) return { error: error.message };

    revalidatePath("/admin/recruiters");
    revalidatePath("/recruiter/profile");
    revalidatePath("/recruiter/jobs");
    return { success: true };
}

export async function batchUpdateRecruiters(
    recruiterIds: string[],
    action: "approve" | "reject" | "suspend",
    reason?: string
) {
    const { user } = await requireAdmin();
    const supabaseAdmin = createAdminClient();

    if (recruiterIds.length === 0) return { error: "No recruiters selected" };

    const updateData: Record<string, unknown> = {
        approval_status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "suspended",
    };

    if (action === "approve") {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user.id;
        updateData.rejection_reason = null;
    } else {
        updateData.approved_at = null;
        updateData.approved_by = null;
        if (action === "reject") {
            updateData.rejection_reason = reason || null;
        }
    }

    const { error } = await supabaseAdmin
        .from("recruiters")
        .update(updateData)
        .in("id", recruiterIds);

    if (error) return { error: error.message };

    revalidatePath("/admin");
    revalidatePath("/admin/recruiters");
    return { success: true, count: recruiterIds.length };
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
            is_verified,
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
            is_verified: company.is_verified || false,
            contact: profile?.full_name || "",
            email: profile?.email || "",
            jobs: company.jobs?.[0]?.count || 0,
        };
    });
}

export async function toggleCompanyVerification(companyId: string, verified: boolean) {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
        .from("companies")
        .update({ is_verified: verified })
        .eq("id", companyId);

    if (error) return { error: error.message };

    revalidatePath("/admin/companies");
    revalidatePath("/company/profile");
    return { success: true };
}

export async function verifyCompanyOrgNumber(companyId: string): Promise<{ valid: boolean; error?: string }> {
    await requireAdmin();
    const supabaseAdmin = createAdminClient();

    const { data: company, error } = await supabaseAdmin
        .from("companies")
        .select("org_number")
        .eq("id", companyId)
        .single();

    if (error || !company) return { valid: false, error: "Company not found" };

    const orgNumber = (company.org_number || "").replace(/[^0-9]/g, "");

    // Swedish org number: 10 digits, first digit 1-9
    if (orgNumber.length !== 10 || !/^[1-9]/.test(orgNumber)) {
        return { valid: false, error: "Invalid format: must be 10 digits (NNNNNN-NNNN)" };
    }

    // Luhn algorithm check (same as used by Bolagsverket)
    const digits = orgNumber.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        let d = digits[i];
        if (i % 2 === 0) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
    }

    if (sum % 10 !== 0) {
        return { valid: false, error: "Invalid org number: Luhn check failed" };
    }

    return { valid: true };
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
