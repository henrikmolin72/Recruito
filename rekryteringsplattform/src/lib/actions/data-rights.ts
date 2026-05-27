"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/actions/require-admin";
import { revalidatePath } from "next/cache";

// GDPR Art. 17 (erasure) + Art. 20 (portability) server actions.
//
// Erasure is two-step:
//   1. User submits a request from /<role>/settings/data → row in
//      data_rights_requests with status='pending'.
//   2. Admin reviews at /admin/data-rights, then either completes or rejects.
//      Actual account/data removal is performed by the admin action.
//
// Export is single-step: the user clicks "Export my data" and receives a
// JSON blob with every row that references their user id.

// ------------------------------------------------------------------
// User-facing: export own data
// ------------------------------------------------------------------
export async function exportMyData(): Promise<
    | { ok: true; data: string; filename: string }
    | { ok: false; error: string }
> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Inte inloggad." };

    const admin = createAdminClient();

    // Collect every row that references this user. Server-side admin client
    // bypasses RLS — safe because we scope every query by user.id.
    const [profile, recruiter, company, notifications, conversations] = await Promise.all([
        admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        admin.from("recruiters").select("*").eq("user_id", user.id).maybeSingle(),
        admin.from("companies").select("*").eq("user_id", user.id).maybeSingle(),
        admin.from("notifications").select("*").eq("user_id", user.id),
        admin.from("conversation_participants")
            .select("conversation_id, last_read_at, conversations(id, candidate_id, job_id, created_at)")
            .eq("user_id", user.id),
    ]);

    const recruiterId = recruiter.data?.id;
    const companyId = company.data?.id;

    const [candidatesSubmitted, placementsAsRecruiter, placementsAsCompany, jobsAsCompany] = await Promise.all([
        recruiterId
            ? admin.from("candidates").select("*").eq("recruiter_id", recruiterId)
            : Promise.resolve({ data: [] as unknown[] }),
        recruiterId
            ? admin.from("placements").select("*").eq("recruiter_id", recruiterId)
            : Promise.resolve({ data: [] as unknown[] }),
        companyId
            ? admin.from("placements").select("*").eq("company_id", companyId)
            : Promise.resolve({ data: [] as unknown[] }),
        companyId
            ? admin.from("jobs").select("*").eq("company_id", companyId)
            : Promise.resolve({ data: [] as unknown[] }),
    ]);

    const dump = {
        exportedAt: new Date().toISOString(),
        exportedFor: { userId: user.id, email: user.email },
        profile: profile.data ?? null,
        recruiterProfile: recruiter.data ?? null,
        companyProfile: company.data ?? null,
        candidatesYouSubmitted: candidatesSubmitted.data ?? [],
        placementsAsRecruiter: placementsAsRecruiter.data ?? [],
        placementsAsCompany: placementsAsCompany.data ?? [],
        jobsAsCompany: jobsAsCompany.data ?? [],
        notifications: notifications.data ?? [],
        conversations: conversations.data ?? [],
        note: "Data tied to placements (invoices, payments) is retained for 7 years per Bokföringslagen §7 even after account deletion.",
    };

    return {
        ok: true,
        data: JSON.stringify(dump, null, 2),
        filename: `recruito-data-${user.id}-${new Date().toISOString().slice(0, 10)}.json`,
    };
}

// ------------------------------------------------------------------
// User-facing: request erasure of own account
// ------------------------------------------------------------------
export async function requestAccountErasure(reason: string): Promise<
    | { ok: true; requestId: string }
    | { ok: false; error: string }
> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Inte inloggad." };

    const trimmedReason = (reason || "").trim().slice(0, 1000);
    const admin = createAdminClient();

    // Block if a pending request already exists for this user.
    const { data: existing } = await admin
        .from("data_rights_requests")
        .select("id")
        .eq("subject_user_id", user.id)
        .eq("request_type", "erasure")
        .in("status", ["pending", "in_progress"])
        .limit(1)
        .maybeSingle();

    if (existing) {
        return { ok: false, error: "Du har redan en aktiv begäran om radering. Vi behandlar den så snart vi kan." };
    }

    const { data, error } = await admin
        .from("data_rights_requests")
        .insert({
            request_type: "erasure",
            status: "pending",
            subject_user_id: user.id,
            requested_by: user.id,
            requested_email: user.email,
            reason: trimmedReason || null,
        })
        .select("id")
        .single();

    if (error || !data) {
        console.error("[requestAccountErasure] failed:", error);
        return { ok: false, error: "Kunde inte registrera din begäran. Försök igen." };
    }

    // Audit-log the request creation (not the actual erasure — that happens
    // when admin processes it).
    await admin.from("audit_log").insert({
        action_type: "erasure_request_created",
        target_type: "user",
        target_id: user.id,
        performed_by: user.id,
        reason: trimmedReason || null,
    });

    return { ok: true, requestId: data.id };
}

// ------------------------------------------------------------------
// Admin-facing
// ------------------------------------------------------------------

export async function getPendingDataRightsRequests() {
    await requireAdmin();
    const admin = createAdminClient();

    const { data, error } = await admin
        .from("data_rights_requests")
        .select(`
            id,
            request_type,
            status,
            subject_user_id,
            subject_candidate_id,
            requested_by,
            requested_email,
            reason,
            created_at,
            subject_profile:profiles!data_rights_requests_subject_user_id_fkey (
                full_name,
                email
            )
        `)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: true });

    if (error) {
        console.error("[getPendingDataRightsRequests] failed:", error);
        return [] as never[];
    }

    return data ?? [];
}

export async function markDataRightsRequestComplete(
    requestId: string,
    decision: "completed" | "rejected",
    adminNotes: string
) {
    const { user } = await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin
        .from("data_rights_requests")
        .update({
            status: decision,
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            admin_notes: (adminNotes || "").trim().slice(0, 2000) || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

    if (error) {
        console.error("[markDataRightsRequestComplete] failed:", error);
        return { error: "Något gick fel. Försök igen." };
    }

    await admin.from("audit_log").insert({
        action_type: `erasure_request_${decision}`,
        target_type: "data_rights_request",
        target_id: requestId,
        performed_by: user.id,
        reason: adminNotes || null,
    });

    revalidatePath("/admin/data-rights");
    return { success: true };
}

// Anonymize a candidate. Called by admin when processing an erasure request
// or when a recruiter/company requests removal of a specific candidate's PII.
export async function anonymizeCandidate(candidateId: string, reason: string) {
    const { user } = await requireAdmin();
    const admin = createAdminClient();

    const trimmedReason = (reason || "").trim().slice(0, 1000);
    if (!trimmedReason) {
        return { error: "Anledning krävs för att radera kandidat." };
    }

    // Best-effort: remove the CV file from Storage before we lose the path.
    // Failure here is logged but not fatal — anonymization of the DB row is
    // the legally-required step.
    const { data: candidate } = await admin
        .from("candidates")
        .select("cv_file_path")
        .eq("id", candidateId)
        .maybeSingle();

    if (candidate?.cv_file_path) {
        const { error: storageError } = await admin.storage
            .from("cvs")
            .remove([candidate.cv_file_path]);
        if (storageError) {
            console.warn("[anonymizeCandidate] CV file removal failed:", storageError);
        }
    }

    const { data, error } = await admin.rpc("anonymize_candidate", {
        p_candidate_id: candidateId,
        p_admin_id: user.id,
        p_reason: trimmedReason,
    });

    if (error || data !== true) {
        console.error("[anonymizeCandidate] RPC failed:", error);
        return { error: "Kunde inte radera kandidatdata. Försök igen." };
    }

    revalidatePath("/admin/data-rights");
    return { success: true };
}
