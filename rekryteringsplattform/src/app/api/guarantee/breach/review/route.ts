import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

export const runtime = "nodejs";

const bodySchema = z.object({
    reportId: z.string().uuid(),
    action: z.enum(["approve", "reject"]),
    notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { reportId, action, notes } = parsed.data;
    const now = new Date().toISOString();

    const { data: report } = await admin
        .from("guarantee_breach_reports")
        .select(`
            id, placement_id, refund_amount, refund_currency, company_id,
            placement:placements(
                id, recruiter_id, total_fee, salary_currency,
                candidate:candidates(first_name, last_name),
                job:jobs(title)
            )
        `)
        .eq("id", reportId)
        .single();

    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    // Update report status
    await admin.from("guarantee_breach_reports").update({
        admin_status: action === "approve" ? "approved" : "rejected",
        admin_reviewed_by: user.id,
        admin_reviewed_at: now,
        admin_notes: notes ?? null,
        updated_at: now,
    }).eq("id", reportId);

    const placement = Array.isArray(report.placement) ? report.placement[0] : report.placement;
    const candidate = Array.isArray(placement?.candidate) ? placement.candidate[0] : placement?.candidate;
    const job = Array.isArray(placement?.job) ? placement.job[0] : placement?.job;
    const name = candidate ? `${candidate.first_name} ${candidate.last_name}` : "kandidaten";
    const jobTitle = (job as any)?.title ?? "uppdraget";

    if (action === "approve") {
        // Mark placement as guarantee_failed + refund_processing
        await admin.from("placements").update({
            status: "refund_processing",
            guarantee_failed_at: now,
            refund_amount: report.refund_amount,
            updated_at: now,
        }).eq("id", report.placement_id);

        // Notify company
        const { data: company } = await admin.from("companies").select("user_id").eq("id", report.company_id).single();
        if (company?.user_id) {
            await createNotification(
                company.user_id,
                "Återbetalning godkänd",
                `Garantibrottet för ${name} (${jobTitle}) har godkänts. Återbetalning på ${report.refund_amount} ${report.refund_currency} bearbetas.`,
                "/company/billing"
            );
        }

        // Notify recruiter
        if (placement?.recruiter_id) {
            const { data: recruiter } = await admin.from("recruiters").select("user_id").eq("id", placement.recruiter_id).single();
            if (recruiter?.user_id) {
                await createNotification(
                    recruiter.user_id,
                    "Garantibrott godkänt",
                    `Garantin för ${name} (${jobTitle}) har misslyckats och återbetalning bearbetas.`,
                    "/recruiter/earnings"
                );
            }
        }
    } else {
        // Notify company — rejected
        const { data: company } = await admin.from("companies").select("user_id").eq("id", report.company_id).single();
        if (company?.user_id) {
            await createNotification(
                company.user_id,
                "Garantibrott avvisat",
                `Ditt garantibrott-ärende för ${name} (${jobTitle}) har granskats och avvisats${notes ? `: ${notes}` : "."}`,
                "/company/billing"
            );
        }
    }

    return NextResponse.json({ ok: true, action });
}
