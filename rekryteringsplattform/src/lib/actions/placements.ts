"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/create";
import { requireAdmin } from "@/lib/actions/require-admin";

// =============================================
// Placement helpers
// =============================================

/**
 * Get a placement by candidate ID (admin-only).
 */
export async function getPlacementByCandidateId(candidateId: string) {
    await requireAdmin();
    const admin = createAdminClient();
    const { data } = await admin
        .from("placements")
        .select("*")
        .eq("candidate_id", candidateId)
        .maybeSingle();
    return data;
}

// =============================================
// Invoice Automation
// =============================================

/**
 * Mark a placement as invoice_sent — called when candidate moves to
 * 'invoice_enabled' or triggered manually by admin.
 *
 * In a production system this would call Stripe API to create an
 * invoice. For now we record the transition and timestamps.
 */
export async function sendPlacementInvoice(placementId: string) {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: placement } = await admin
        .from("placements")
        .select("*, candidate:candidates(first_name, last_name, job_id), job:jobs(title), company:companies(user_id, company_name)")
        .eq("id", placementId)
        .single();

    if (!placement) return { error: "Placering hittades inte" };

    if (placement.status !== "confirmed" && placement.status !== "guarantee_active") {
        return { error: `Faktura kan inte skickas i status: ${placement.status}` };
    }

    // Already invoiced?
    if (placement.invoice_sent_at) {
        return { error: "Faktura har redan skickats" };
    }

    const { error } = await admin
        .from("placements")
        .update({
            status: "invoice_sent",
            invoice_sent_at: new Date().toISOString(),
        })
        .eq("id", placementId);

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    // Notify company about invoice
    const companyData = Array.isArray(placement.company) ? placement.company[0] : placement.company;
    const companyUserId = companyData?.user_id;
    const candidateData = Array.isArray(placement.candidate) ? placement.candidate[0] : placement.candidate;
    const candidateName = candidateData
        ? `${candidateData.first_name} ${candidateData.last_name}`
        : "kandidaten";
    const jobTitle = Array.isArray(placement.job) ? placement.job[0]?.title : placement.job?.title;

    if (companyUserId) {
        await createNotification(
            companyUserId,
            "Faktura skickad",
            `Faktura för ${candidateName} (${jobTitle || "uppdraget"}) har skickats. Belopp: ${placement.total_fee} ${placement.salary_currency}.`,
            `/company/billing`
        );
    }

    // Notify recruiter
    const { data: recruiter } = await admin
        .from("recruiters")
        .select("user_id")
        .eq("id", placement.recruiter_id)
        .single();

    if (recruiter?.user_id) {
        await createNotification(
            recruiter.user_id,
            "Faktura har skickats till företaget",
            `Faktura för ${candidateName} (${jobTitle || "uppdraget"}) är utskickad. Ditt arvode: ${placement.recruiter_fee} ${placement.salary_currency}.`,
            `/recruiter/earnings`
        );
    }

    revalidatePath("/admin/placements");
    revalidatePath("/company/billing");
    revalidatePath("/recruiter/earnings");
    return { success: true };
}

/**
 * Record that payment has been received for a placement.
 */
export async function recordPlacementPayment(placementId: string) {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: placement } = await admin
        .from("placements")
        .select("*, candidate:candidates(first_name, last_name)")
        .eq("id", placementId)
        .single();

    if (!placement) return { error: "Placering hittades inte" };
    if (placement.status !== "invoice_sent") {
        return { error: `Kan inte registrera betalning i status: ${placement.status}` };
    }

    const nextStatus = placement.guarantee_end_date && new Date(placement.guarantee_end_date) > new Date()
        ? "guarantee_active"
        : "payout_released";

    const updatePatch: Record<string, any> = {
        status: nextStatus,
        payment_received_at: new Date().toISOString(),
    };

    if (nextStatus === "payout_released") {
        updatePatch.payout_released_at = new Date().toISOString();
        updatePatch.completed_at = new Date().toISOString();
    }

    const { error } = await admin
        .from("placements")
        .update(updatePatch)
        .eq("id", placementId);

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    // If entering guarantee, update candidate status
    if (nextStatus === "guarantee_active") {
        await admin
            .from("candidates")
            .update({
                status: "guarantee_tracking",
                status_changed_at: new Date().toISOString(),
            })
            .eq("id", placement.candidate_id);
    }

    // Notify recruiter
    const { data: recruiter } = await admin
        .from("recruiters")
        .select("user_id")
        .eq("id", placement.recruiter_id)
        .single();

    const candidateData = Array.isArray(placement.candidate) ? placement.candidate[0] : placement.candidate;
    const candidateName = candidateData
        ? `${candidateData.first_name} ${candidateData.last_name}`
        : "kandidaten";

    if (recruiter?.user_id) {
        const msg = nextStatus === "guarantee_active"
            ? `Betalning mottagen för ${candidateName}. Garantiperioden har startat.`
            : `Betalning mottagen och utbetalning frigiven för ${candidateName}!`;

        await createNotification(
            recruiter.user_id,
            "Betalning mottagen",
            msg,
            `/recruiter/earnings`
        );
    }

    revalidatePath("/admin/placements");
    revalidatePath("/company/billing");
    revalidatePath("/recruiter/earnings");
    return { success: true };
}

// =============================================
// Guarantee Period Automation
// =============================================

/**
 * Process all placements where guarantee period has expired.
 * Currently only triggered manually by admin from the UI. If/when this
 * is wired to a Supabase Edge Function cron, requireAdmin() will redirect
 * (no user context) — extract the body into a non-action helper and gate
 * the cron route with a CRON_SECRET header instead.
 */
export async function processGuaranteeExpirations() {
    await requireAdmin();
    const admin = createAdminClient();

    // Find all guarantee_active placements past their end date
    const { data: expired } = await admin
        .from("placements")
        .select("id, candidate_id, recruiter_id, company_id, recruiter_fee, salary_currency, candidate:candidates(first_name, last_name), job:jobs(title)")
        .eq("status", "guarantee_active")
        .lte("guarantee_end_date", new Date().toISOString().split("T")[0]);

    if (!expired || expired.length === 0) {
        return { success: true, processed: 0 };
    }

    let processed = 0;

    for (const placement of expired) {
        // Release payout
        const { error } = await admin
            .from("placements")
            .update({
                status: "payout_released",
                payout_released_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
            })
            .eq("id", placement.id);

        if (error) {
            console.error(`Failed to complete placement ${placement.id}:`, error);
            continue;
        }

        // Update candidate to completed
        await admin
            .from("candidates")
            .update({
                status: "completed",
                status_changed_at: new Date().toISOString(),
            })
            .eq("id", placement.candidate_id);

        // Notify recruiter
        const { data: recruiter } = await admin
            .from("recruiters")
            .select("user_id")
            .eq("id", placement.recruiter_id)
            .single();

        const candidateData = Array.isArray(placement.candidate) ? placement.candidate[0] : placement.candidate;
        const candidateName = candidateData
            ? `${candidateData.first_name} ${candidateData.last_name}`
            : "kandidaten";
        const jobTitle = Array.isArray(placement.job) ? placement.job[0]?.title : (placement.job as any)?.title;

        if (recruiter?.user_id) {
            await createNotification(
                recruiter.user_id,
                "Garantiperiod avslutad — utbetalning frigiven!",
                `Garantiperioden för ${candidateName} (${jobTitle || "uppdraget"}) har löpt ut. Ditt arvode ${placement.recruiter_fee} ${placement.salary_currency} har frigivits.`,
                `/recruiter/earnings`
            );
        }

        // Notify company
        const { data: company } = await admin
            .from("companies")
            .select("user_id")
            .eq("id", placement.company_id)
            .single();

        if (company?.user_id) {
            await createNotification(
                company.user_id,
                "Garantiperiod avslutad",
                `Garantiperioden för ${candidateName} (${jobTitle || "uppdraget"}) har löpt ut framgångsrikt.`,
                `/company/billing`
            );
        }

        // Recalculate recruiter metrics
        await recalculateRecruiterMetrics(placement.recruiter_id);

        processed++;
    }

    revalidatePath("/admin/placements");
    return { success: true, processed };
}

/**
 * Report a guarantee failure — candidate left during guarantee period.
 * Initiates refund processing.
 */
export async function reportGuaranteeFailure(placementId: string, reason?: string) {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: placement } = await admin
        .from("placements")
        .select("*, candidate:candidates(first_name, last_name), job:jobs(title)")
        .eq("id", placementId)
        .single();

    if (!placement) return { error: "Placering hittades inte" };
    if (placement.status !== "guarantee_active") {
        return { error: "Placeringen är inte i aktiv garantiperiod" };
    }

    const failureReason = reason?.trim() || "Kandidaten lämnade under garantiperioden";

    const { error } = await admin
        .from("placements")
        .update({
            status: "guarantee_failed",
            guarantee_failed_at: new Date().toISOString(),
            guarantee_failed_reason: failureReason,
            refund_amount: placement.total_fee,
        })
        .eq("id", placementId);

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    // Update candidate
    await admin
        .from("candidates")
        .update({
            status: "completed",
            status_changed_at: new Date().toISOString(),
        })
        .eq("id", placement.candidate_id);

    const candidateData = Array.isArray(placement.candidate) ? placement.candidate[0] : placement.candidate;
    const candidateName = candidateData
        ? `${candidateData.first_name} ${candidateData.last_name}`
        : "kandidaten";
    const jobTitle = Array.isArray(placement.job) ? placement.job[0]?.title : (placement.job as any)?.title;

    // Notify recruiter
    const { data: recruiter } = await admin
        .from("recruiters")
        .select("user_id")
        .eq("id", placement.recruiter_id)
        .single();

    if (recruiter?.user_id) {
        await createNotification(
            recruiter.user_id,
            "Garantiperiod — misslyckad",
            `Garantin för ${candidateName} (${jobTitle || "uppdraget"}) har rapporterats som misslyckad. Anledning: ${failureReason}`,
            `/recruiter/earnings`
        );
    }

    // Notify company
    const { data: company } = await admin
        .from("companies")
        .select("user_id")
        .eq("id", placement.company_id)
        .single();

    if (company?.user_id) {
        await createNotification(
            company.user_id,
            "Garantiperiod — misslyckad, återbetalning påbörjad",
            `Garantin för ${candidateName} (${jobTitle || "uppdraget"}) har rapporterats som misslyckad. Återbetalning på ${placement.total_fee} ${placement.salary_currency} påbörjas.`,
            `/company/billing`
        );
    }

    // Recalculate recruiter metrics
    await recalculateRecruiterMetrics(placement.recruiter_id);

    revalidatePath("/admin/placements");
    revalidatePath("/company/billing");
    revalidatePath("/recruiter/earnings");
    return { success: true };
}

// =============================================
// Performance Metrics
// =============================================

/**
 * Recalculate performance metrics for a single recruiter (admin-only).
 * Uses the database function for accuracy.
 */
export async function recalculateRecruiterMetrics(recruiterId: string) {
    await requireAdmin();
    const admin = createAdminClient();

    const { error } = await admin.rpc("fn_recalculate_recruiter_metrics", {
        p_recruiter_id: recruiterId,
    });

    if (error) {
        console.error(`Failed to recalculate metrics for recruiter ${recruiterId}:`, error);
        return { error: "Något gick fel. Försök igen." };
    }

    return { success: true };
}

/**
 * Recalculate metrics for ALL recruiters (admin batch job).
 */
export async function recalculateAllRecruiterMetrics() {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: recruiters } = await admin
        .from("recruiters")
        .select("id")
        .eq("approval_status", "approved");

    if (!recruiters) return { success: true, updated: 0 };

    let updated = 0;
    for (const r of recruiters) {
        const result = await recalculateRecruiterMetrics(r.id);
        if (result.success) updated++;
    }

    revalidatePath("/admin/recruiters");
    return { success: true, updated };
}

/**
 * Get performance metrics for the current recruiter.
 */
export async function getRecruiterPerformanceMetrics() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: recruiter } = await supabase
        .from("recruiters")
        .select(`
            id,
            total_placements,
            rating,
            perf_hire_rate,
            perf_avg_time_to_hire_days,
            perf_candidates_submitted,
            perf_candidates_hired,
            perf_active_placements,
            perf_guarantee_success_rate,
            perf_last_calculated_at
        `)
        .eq("user_id", user.id)
        .single();

    if (!recruiter) return null;

    // If metrics are stale (older than 1 hour), recalculate
    const lastCalc = recruiter.perf_last_calculated_at
        ? new Date(recruiter.perf_last_calculated_at)
        : null;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (!lastCalc || lastCalc < oneHourAgo) {
        await recalculateRecruiterMetrics(recruiter.id);

        // Re-fetch updated metrics
        const { data: updated } = await supabase
            .from("recruiters")
            .select(`
                perf_hire_rate,
                perf_avg_time_to_hire_days,
                perf_candidates_submitted,
                perf_candidates_hired,
                perf_active_placements,
                perf_guarantee_success_rate,
                perf_last_calculated_at
            `)
            .eq("id", recruiter.id)
            .single();

        if (updated) {
            return {
                totalPlacements: recruiter.total_placements ?? 0,
                rating: recruiter.rating ?? 0,
                hireRate: updated.perf_hire_rate ?? 0,
                avgTimeToHireDays: updated.perf_avg_time_to_hire_days ?? 0,
                candidatesSubmitted: updated.perf_candidates_submitted ?? 0,
                candidatesHired: updated.perf_candidates_hired ?? 0,
                activePlacements: updated.perf_active_placements ?? 0,
                guaranteeSuccessRate: updated.perf_guarantee_success_rate ?? 100,
            };
        }
    }

    return {
        totalPlacements: recruiter.total_placements ?? 0,
        rating: recruiter.rating ?? 0,
        hireRate: recruiter.perf_hire_rate ?? 0,
        avgTimeToHireDays: recruiter.perf_avg_time_to_hire_days ?? 0,
        candidatesSubmitted: recruiter.perf_candidates_submitted ?? 0,
        candidatesHired: recruiter.perf_candidates_hired ?? 0,
        activePlacements: recruiter.perf_active_placements ?? 0,
        guaranteeSuccessRate: recruiter.perf_guarantee_success_rate ?? 100,
    };
}

// =============================================
// Admin: get all placements with full details
// =============================================

export async function getAdminPlacements() {
    await requireAdmin();
    const admin = createAdminClient();
    const { data } = await admin
        .from("placements")
        .select(`
            *,
            candidate:candidates(first_name, last_name, email, status),
            job:jobs(title),
            company:companies(company_name),
            recruiter:recruiters(id, user_id)
        `)
        .order("created_at", { ascending: false });

    return data || [];
}
