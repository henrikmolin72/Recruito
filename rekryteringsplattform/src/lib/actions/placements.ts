"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/create";
import { requireAdmin } from "@/lib/actions/require-admin";
import { sendUserEmail } from "@/lib/email/internal-notifications";
import { paymentCompletedEmail } from "@/lib/email/email-templates";
import { mapRecruiterPerfRow, isPerfSnapshotStale } from "@/lib/recruiter-metrics";
import { logCandidateStageChange } from "@/lib/candidate-stage-history";
import { computeGuaranteeEndDate } from "@/lib/guarantee";

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
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { data: placement } = await admin
        .from("placements")
        .select("*, candidate:candidates!placements_candidate_id_fkey(first_name, last_name, job_id), job:jobs(title), company:companies(user_id, company_name)")
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

    // Audit trail: financial action on a placement (admin-performed). Best-effort —
    // never fail the placement mutation on an audit-write error, but log it so a
    // missing financial-trail entry is visible (e.g. a performed_by FK gap).
    const { error: invoiceAuditError } = await admin.from("audit_log").insert({
        action_type: "placement_invoice_sent",
        target_type: "placement",
        target_id: placementId,
        performed_by: adminUser.id,
        metadata: { total_fee: placement.total_fee, currency: placement.salary_currency },
    });
    if (invoiceAuditError) console.error("[audit:placement_invoice_sent]", { code: invoiceAuditError.code, message: invoiceAuditError.message });

    // Notify company about invoice
    const companyData = Array.isArray(placement.company) ? placement.company[0] : placement.company;
    const companyUserId = companyData?.user_id;
    const candidateData = Array.isArray(placement.candidate) ? placement.candidate[0] : placement.candidate;
    const candidateName = candidateData
        ? `${candidateData.first_name} ${candidateData.last_name}`
        : "kandidaten";
    const jobTitle = Array.isArray(placement.job) ? placement.job[0]?.title : placement.job?.title;

    if (companyUserId) {
        await createNotification(companyUserId, {
            titleKey: "notif.invoiceSentCompanyTitle",
            bodyKey: "notif.invoiceSentCompanyBody",
            params: { candidate: candidateName, jobTitle: jobTitle || "uppdraget", amount: placement.total_fee, currency: placement.salary_currency },
            link: `/company/billing`,
        });
    }

    // Notify recruiter
    const { data: recruiter } = await admin
        .from("recruiters")
        .select("user_id")
        .eq("id", placement.recruiter_id)
        .single();

    if (recruiter?.user_id) {
        await createNotification(recruiter.user_id, {
            titleKey: "notif.invoiceSentRecruiterTitle",
            bodyKey: "notif.invoiceSentRecruiterBody",
            params: { candidate: candidateName, jobTitle: jobTitle || "uppdraget", fee: placement.recruiter_fee, currency: placement.salary_currency },
            link: `/recruiter/earnings`,
        });
    }

    revalidatePath("/admin/guarantees");
    revalidatePath("/company/billing");
    revalidatePath("/company/guarantees");
    revalidatePath("/recruiter/earnings");
    revalidatePath("/recruiter/guarantees");
    return { success: true };
}

/**
 * Record that payment has been received for a placement.
 */
export async function recordPlacementPayment(placementId: string) {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { data: placement } = await admin
        .from("placements")
        .select("*, candidate:candidates!placements_candidate_id_fkey(first_name, last_name), job:jobs(guarantee_period_months)")
        .eq("id", placementId)
        .single();

    if (!placement) return { error: "Placering hittades inte" };
    if (placement.status !== "invoice_sent") {
        return { error: `Kan inte registrera betalning i status: ${placement.status}` };
    }

    const jobData = Array.isArray(placement.job) ? placement.job[0] : placement.job;
    const guaranteeMonths = jobData?.guarantee_period_months ?? 0;

    // The guarantee runs from the client-confirmed joining date (migration 067).
    // Paid but not yet joined on a guarantee job → park as payment_received;
    // setPlacementJoiningDate activates the guarantee once the date is entered.
    const nextStatus = placement.guarantee_end_date && new Date(placement.guarantee_end_date) > new Date()
        ? "guarantee_active"
        : !placement.guarantee_end_date && guaranteeMonths > 0
            ? "payment_received"
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

    // Audit trail: payment recorded (admin-performed). Best-effort; log on failure.
    const { error: paymentAuditError } = await admin.from("audit_log").insert({
        action_type: "placement_payment_recorded",
        target_type: "placement",
        target_id: placementId,
        performed_by: adminUser.id,
        metadata: { next_status: nextStatus },
    });
    if (paymentAuditError) console.error("[audit:placement_payment_recorded]", { code: paymentAuditError.code, message: paymentAuditError.message });

    // If entering guarantee, update candidate status
    if (nextStatus === "guarantee_active") {
        const { error: candidateError } = await admin
            .from("candidates")
            .update({
                status: "guarantee_tracking",
                status_changed_at: new Date().toISOString(),
            })
            .eq("id", placement.candidate_id);
        if (candidateError) {
            console.error(
                `[recordPlacementPayment] candidate ${placement.candidate_id} not moved to guarantee_tracking:`,
                candidateError
            );
        } else {
            await logCandidateStageChange({
                candidateId: placement.candidate_id,
                jobId: placement.job_id,
                fromStage: "hired",
                toStage: "guarantee_tracking",
                action: "move",
                changedBy: adminUser.id,
                changedByRole: "admin",
            });
        }
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
        await createNotification(recruiter.user_id, {
            titleKey: "notif.paymentReceivedTitle",
            bodyKey: nextStatus === "guarantee_active"
                ? "notif.paymentReceivedGuaranteeBody"
                : nextStatus === "payment_received"
                    ? "notif.paymentReceivedPendingJoinBody"
                    : "notif.paymentReceivedReleasedBody",
            params: { candidate: candidateName },
            link: `/recruiter/earnings`,
        });

        // Send confirmation email (honors profiles.email_opt_out)
        try {
            const { data: recruiterProfile } = await admin
                .from("profiles")
                .select("email, full_name, email_opt_out")
                .eq("id", recruiter.user_id)
                .single();

            if (recruiterProfile?.email && !(recruiterProfile as any).email_opt_out) {
                const { data: jobRow } = placement.job_id
                    ? await admin.from("jobs").select("title").eq("id", placement.job_id).single()
                    : { data: null as { title?: string } | null };
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://recruito.com";

                await sendUserEmail({
                    to: recruiterProfile.email,
                    subject: `Payment received for ${candidateName}`,
                    html: paymentCompletedEmail({
                        recruiterName: recruiterProfile.full_name || "Recruiter",
                        jobTitle: jobRow?.title || "Position",
                        candidateName,
                        payoutUrl: `${baseUrl}/recruiter/earnings`,
                    }),
                });
            }
        } catch (err) {
            console.error("[recordPlacementPayment email]", err);
        }
    }

    // Recruiter dashboard sync: Active guarantees / guarantee result update immediately
    // instead of waiting for the hourly refresh-on-read.
    await recalculateRecruiterMetrics(placement.recruiter_id);

    revalidatePath("/admin/guarantees");
    revalidatePath("/company/billing");
    revalidatePath("/company/guarantees");
    revalidatePath("/recruiter/earnings");
    revalidatePath("/recruiter/guarantees");
    return { success: true };
}

/**
 * Admin enters the client-confirmed joining date — the day the candidate
 * actually started (after their notice period). The guarantee period runs
 * from this date: guarantee_end_date = joining_date + the job's
 * guarantee_period_months, unless an explicit end date override is given.
 * Activates the guarantee when the placement isn't blocked on payment state.
 */
export async function setPlacementJoiningDate(
    placementId: string,
    joiningDate: string,
    guaranteeEndOverride?: string,
) {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    if (!DATE_RE.test(joiningDate) || Number.isNaN(new Date(joiningDate).getTime())) {
        return { error: "Ogiltigt tillträdesdatum" };
    }
    if (guaranteeEndOverride !== undefined && guaranteeEndOverride !== "") {
        if (!DATE_RE.test(guaranteeEndOverride) || Number.isNaN(new Date(guaranteeEndOverride).getTime())) {
            return { error: "Ogiltigt slutdatum" };
        }
        if (guaranteeEndOverride < joiningDate) {
            return { error: "Slutdatumet kan inte vara före tillträdesdatumet" };
        }
    }

    const { data: placement } = await admin
        .from("placements")
        .select("id, status, candidate_id, job_id, job:jobs(guarantee_period_months)")
        .eq("id", placementId)
        .single();

    if (!placement) return { error: "Placering hittades inte" };
    if (["payout_released", "guarantee_failed", "refund_processing"].includes(placement.status)) {
        return { error: `Tillträdesdatum kan inte ändras i status: ${placement.status}` };
    }

    const jobData = Array.isArray(placement.job) ? placement.job[0] : placement.job;
    const guaranteeMonths = jobData?.guarantee_period_months ?? 0;
    const guaranteeEnd = guaranteeEndOverride?.trim()
        ? guaranteeEndOverride
        : computeGuaranteeEndDate(joiningDate, guaranteeMonths);

    // Activate when there is a live guarantee window and the placement isn't
    // waiting on an invoice payment (invoice_sent flips via recordPlacementPayment,
    // which now sees the end date). Mirrors the pre-067 trigger behavior where a
    // placement could be guarantee_active before invoicing.
    const activate =
        guaranteeMonths > 0 &&
        new Date(guaranteeEnd) > new Date() &&
        (placement.status === "confirmed" || placement.status === "payment_received");

    const { error } = await admin
        .from("placements")
        .update({
            joining_date: joiningDate,
            guarantee_end_date: guaranteeEnd,
            ...(activate ? { status: "guarantee_active" } : {}),
        })
        .eq("id", placementId);

    if (error) {
        console.error("[ServerAction]", error);
        return { error: "Något gick fel. Försök igen." };
    }

    // Keep the candidate mirrors (018) in sync — used by candidate views.
    const { error: mirrorError } = await admin
        .from("candidates")
        .update({ guarantee_start_date: joiningDate, guarantee_end_date: guaranteeEnd })
        .eq("id", placement.candidate_id);
    if (mirrorError) console.error("[setPlacementJoiningDate mirror]", mirrorError);

    // Audit trail: guarantee window set/changed (admin-performed). Best-effort.
    const { error: auditError } = await admin.from("audit_log").insert({
        action_type: "placement_joining_date_set",
        target_type: "placement",
        target_id: placementId,
        performed_by: adminUser.id,
        metadata: { joining_date: joiningDate, guarantee_end_date: guaranteeEnd, activated: activate },
    });
    if (auditError) console.error("[audit:placement_joining_date_set]", { code: auditError.code, message: auditError.message });

    if (activate) {
        const { error: candidateError } = await admin
            .from("candidates")
            .update({ status: "guarantee_tracking", status_changed_at: new Date().toISOString() })
            .eq("id", placement.candidate_id);
        if (candidateError) {
            console.error(`[setPlacementJoiningDate] candidate ${placement.candidate_id} not moved to guarantee_tracking:`, candidateError);
        } else {
            await logCandidateStageChange({
                candidateId: placement.candidate_id,
                jobId: placement.job_id,
                fromStage: "hired",
                toStage: "guarantee_tracking",
                action: "move",
                changedBy: adminUser.id,
                changedByRole: "admin",
            });
        }
    }

    revalidatePath("/admin/guarantees");
    revalidatePath("/company/billing");
    revalidatePath("/company/guarantees");
    revalidatePath("/recruiter/earnings");
    revalidatePath("/recruiter/guarantees");
    return { success: true };
}

/**
 * Live guarantee countdowns for the recruiter/company dashboards — own
 * placements via RLS, only rows with a confirmed joining date and a
 * still-running guarantee window.
 */
export async function getMyActiveGuaranteeTimers() {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
        .from("placements")
        .select(`
            id, joining_date, guarantee_end_date, status,
            candidate:candidates!placements_candidate_id_fkey(first_name, last_name),
            job:jobs(title)
        `)
        .not("joining_date", "is", null)
        .gte("guarantee_end_date", today)
        .in("status", ["confirmed", "invoice_sent", "payment_received", "guarantee_active"])
        .order("guarantee_end_date", { ascending: true });

    return (data ?? []).map((p: any) => {
        const candidate = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate;
        const job = Array.isArray(p.job) ? p.job[0] : p.job;
        return {
            id: p.id as string,
            joiningDate: p.joining_date as string,
            guaranteeEndDate: p.guarantee_end_date as string,
            candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}` : "—",
            jobTitle: job?.title ?? "—",
        };
    });
}

// =============================================
// Guarantee Period Automation
// =============================================

type GuaranteePlacementRow = {
    id: string;
    candidate_id: string;
    job_id: string;
    recruiter_id: string;
    company_id: string;
    recruiter_fee: number;
    salary_currency: string;
    candidate: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
    job: { title: string } | { title: string }[] | null;
};

/**
 * Shared completion path for a guarantee_active placement: release payout,
 * complete the candidate, write the audit trail, notify both parties and
 * resync the recruiter's dashboard metrics. Used by both the batch
 * expiration processor and the admin's manual "guarantee completed" action.
 */
async function releaseGuaranteePayout(
    admin: ReturnType<typeof createAdminClient>,
    adminUserId: string,
    placement: GuaranteePlacementRow,
    auditActionType: "placement_payout_auto_released" | "placement_guarantee_completed",
): Promise<boolean> {
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
        return false;
    }

    // Audit trail: guarantee period ended, payout released. Best-effort; log on failure.
    const { error: auditError } = await admin.from("audit_log").insert({
        action_type: auditActionType,
        target_type: "placement",
        target_id: placement.id,
        performed_by: adminUserId,
        metadata: { recruiter_fee: placement.recruiter_fee, currency: placement.salary_currency },
    });
    if (auditError) console.error(`[audit:${auditActionType}]`, { code: auditError.code, message: auditError.message });

    // Update candidate to completed
    const { error: candidateError } = await admin
        .from("candidates")
        .update({
            status: "completed",
            status_changed_at: new Date().toISOString(),
        })
        .eq("id", placement.candidate_id);
    if (candidateError) {
        console.error(
            `[releaseGuaranteePayout] candidate ${placement.candidate_id} not moved to completed:`,
            candidateError
        );
    } else {
        await logCandidateStageChange({
            candidateId: placement.candidate_id,
            jobId: placement.job_id,
            fromStage: "guarantee_tracking",
            toStage: "completed",
            action: "move",
            changedBy: adminUserId,
            changedByRole: "admin",
        });
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
    const jobTitle = Array.isArray(placement.job) ? placement.job[0]?.title : (placement.job as any)?.title;

    if (recruiter?.user_id) {
        await createNotification(recruiter.user_id, {
            titleKey: "notif.guaranteeReleasedTitle",
            bodyKey: "notif.guaranteeReleasedBody",
            params: { candidate: candidateName, jobTitle: jobTitle || "uppdraget", fee: placement.recruiter_fee, currency: placement.salary_currency },
            link: `/recruiter/earnings`,
        });
    }

    // Notify company
    const { data: company } = await admin
        .from("companies")
        .select("user_id")
        .eq("id", placement.company_id)
        .single();

    if (company?.user_id) {
        await createNotification(company.user_id, {
            titleKey: "notif.guaranteeEndedCompanyTitle",
            bodyKey: "notif.guaranteeEndedCompanyBody",
            params: { candidate: candidateName, jobTitle: jobTitle || "uppdraget" },
            link: `/company/billing`,
        });
    }

    // Recalculate recruiter metrics
    await recalculateRecruiterMetrics(placement.recruiter_id);

    return true;
}

/**
 * Admin marks a guarantee period as completed — releases the payout
 * without waiting for the guarantee end date to pass.
 */
export async function completeGuarantee(placementId: string) {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { data: placement } = await admin
        .from("placements")
        // candidates!placements_candidate_id_fkey: candidates.placement_id (018) makes the
        // plain `candidates` embed ambiguous on newer PostgREST versions.
        .select("id, status, candidate_id, job_id, recruiter_id, company_id, recruiter_fee, salary_currency, candidate:candidates!placements_candidate_id_fkey(first_name, last_name), job:jobs(title)")
        .eq("id", placementId)
        .single();

    if (!placement) return { error: "Placering hittades inte" };
    if (placement.status !== "guarantee_active") {
        return { error: "Placeringen är inte i aktiv garantiperiod" };
    }

    const ok = await releaseGuaranteePayout(admin, adminUser.id, placement as GuaranteePlacementRow, "placement_guarantee_completed");
    if (!ok) return { error: "Något gick fel. Försök igen." };

    revalidatePath("/admin/guarantees");
    revalidatePath("/company/billing");
    revalidatePath("/company/guarantees");
    revalidatePath("/recruiter/earnings");
    revalidatePath("/recruiter/guarantees");
    return { success: true };
}

/**
 * Process all placements where guarantee period has expired.
 * Currently only triggered manually by admin from the UI. If/when this
 * is wired to a Supabase Edge Function cron, requireAdmin() will redirect
 * (no user context) — extract the body into a non-action helper and gate
 * the cron route with a CRON_SECRET header instead.
 */
export async function processGuaranteeExpirations() {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    // Find all guarantee_active placements past their end date
    const { data: expired } = await admin
        .from("placements")
        .select("id, candidate_id, job_id, recruiter_id, company_id, recruiter_fee, salary_currency, candidate:candidates!placements_candidate_id_fkey(first_name, last_name), job:jobs(title)")
        .eq("status", "guarantee_active")
        .lte("guarantee_end_date", new Date().toISOString().split("T")[0]);

    if (!expired || expired.length === 0) {
        return { success: true, processed: 0 };
    }

    let processed = 0;

    for (const placement of expired) {
        const ok = await releaseGuaranteePayout(admin, adminUser.id, placement as unknown as GuaranteePlacementRow, "placement_payout_auto_released");
        if (ok) processed++;
    }

    revalidatePath("/admin/guarantees");
    return { success: true, processed };
}

/**
 * Report a guarantee failure — candidate left during guarantee period.
 * Initiates refund processing.
 */
export async function reportGuaranteeFailure(placementId: string, reason?: string) {
    const { user: adminUser } = await requireAdmin();
    const admin = createAdminClient();

    const { data: placement } = await admin
        .from("placements")
        .select("*, candidate:candidates!placements_candidate_id_fkey(first_name, last_name), job:jobs(title)")
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

    // Audit trail: guarantee failure triggers refund — record it (admin-performed).
    // Best-effort; log on failure so a missing refund-trail entry is visible.
    const { error: guaranteeAuditError } = await admin.from("audit_log").insert({
        action_type: "placement_guarantee_failed",
        target_type: "placement",
        target_id: placementId,
        performed_by: adminUser.id,
        reason: failureReason,
        metadata: { refund_amount: placement.total_fee },
    });
    if (guaranteeAuditError) console.error("[audit:placement_guarantee_failed]", { code: guaranteeAuditError.code, message: guaranteeAuditError.message });

    // Update candidate
    const { error: candidateError } = await admin
        .from("candidates")
        .update({
            status: "completed",
            status_changed_at: new Date().toISOString(),
        })
        .eq("id", placement.candidate_id);
    if (candidateError) {
        console.error(
            `[reportGuaranteeFailure] candidate ${placement.candidate_id} not moved to completed:`,
            candidateError
        );
    } else {
        await logCandidateStageChange({
            candidateId: placement.candidate_id,
            jobId: placement.job_id,
            fromStage: "guarantee_tracking",
            toStage: "guarantee_failed",
            action: "move",
            changedBy: adminUser.id,
            changedByRole: "admin",
            reason: failureReason,
        });
    }

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
        await createNotification(recruiter.user_id, {
            titleKey: "notif.guaranteeFailedRecruiterTitle",
            bodyKey: "notif.guaranteeFailedRecruiterBody",
            params: { candidate: candidateName, jobTitle: jobTitle || "uppdraget", reason: failureReason },
            link: `/recruiter/earnings`,
        });
    }

    // Notify company
    const { data: company } = await admin
        .from("companies")
        .select("user_id")
        .eq("id", placement.company_id)
        .single();

    if (company?.user_id) {
        await createNotification(company.user_id, {
            titleKey: "notif.guaranteeFailedCompanyTitle",
            bodyKey: "notif.guaranteeFailedCompanyBody",
            params: { candidate: candidateName, jobTitle: jobTitle || "uppdraget", amount: placement.total_fee, currency: placement.salary_currency },
            link: `/company/billing`,
        });
    }

    // Recalculate recruiter metrics
    await recalculateRecruiterMetrics(placement.recruiter_id);

    revalidatePath("/admin/guarantees");
    revalidatePath("/company/billing");
    revalidatePath("/company/guarantees");
    revalidatePath("/recruiter/earnings");
    revalidatePath("/recruiter/guarantees");
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

    let { data: recruiter } = await supabase
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

    // Refresh-on-read: the snapshot otherwise only updates on placement events or the
    // admin batch job, so a recruiter with candidate activity but no placements shows
    // zeros forever. The RPC needs the service role (fn not exposed to recruiters) but
    // is scoped to the recruiter's own row; any failure falls back to the stale snapshot.
    if (isPerfSnapshotStale(recruiter.perf_last_calculated_at, new Date())) {
        const admin = createAdminClient();
        const { error: recalcError } = await admin.rpc("fn_recalculate_recruiter_metrics", {
            p_recruiter_id: recruiter.id,
        });
        if (!recalcError) {
            // ponytail: pre-migration-063 the DB fn still writes a fake 100% guarantee rate
            // when no guarantee ever completed — null it back out. No-op once 063 is applied.
            const { count } = await supabase
                .from("placements")
                .select("id", { count: "exact", head: true })
                .eq("recruiter_id", recruiter.id)
                .in("status", ["payout_released", "guarantee_failed"]);
            if ((count ?? 0) === 0) {
                await admin
                    .from("recruiters")
                    .update({ perf_guarantee_success_rate: null })
                    .eq("id", recruiter.id);
            }
            const { data: fresh } = await supabase
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
            if (fresh) recruiter = fresh;
        }
    }

    return mapRecruiterPerfRow(recruiter);
}

