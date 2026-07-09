/**
 * POST /api/guarantee/breach
 * Company-initiated guarantee breach report.
 * Admin is notified and must approve/reject the refund.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { computeProportionalRefund } from "@/lib/guarantee";

export const runtime = "nodejs";

const bodySchema = z.object({
    placementId: z.string().uuid(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.enum(["candidate_resigned", "performance", "mutual_agreement", "other"]),
    notes: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const { placementId, endDate, reason, notes } = parsed.data;
    const admin = createAdminClient();

    // Verify company ownership
    const { data: company } = await admin.from("companies").select("id").eq("user_id", user.id).single();
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    const { data: placement } = await admin
        .from("placements")
        .select("id, company_id, total_fee, salary_currency, start_date, joining_date, guarantee_end_date, status, candidate:candidates!placements_candidate_id_fkey(first_name, last_name), job:jobs(title)")
        .eq("id", placementId)
        .eq("company_id", company.id)
        .single();

    if (!placement) return NextResponse.json({ error: "Placement not found" }, { status: 404 });
    if (!["guarantee_active", "payout_released"].includes(placement.status)) {
        return NextResponse.json({ error: "Placement is not in an active guarantee period" }, { status: 400 });
    }

    // Calculate proportional refund over the real guarantee window: the guarantee
    // runs from the client-confirmed joining_date (067) — fall back to start_date
    // for legacy rows. Fraction is clamped to [0,1].
    const refundAmount = placement.guarantee_end_date
        ? computeProportionalRefund(
            placement.total_fee,
            (placement as { joining_date?: string | null; start_date?: string | null }).joining_date
                ?? (placement as { start_date?: string | null }).start_date
                ?? null,
            placement.guarantee_end_date,
        )
        : placement.total_fee;

    // Insert breach report
    const { data: report, error } = await admin.from("guarantee_breach_reports").insert({
        placement_id: placementId,
        company_id: company.id,
        reported_by: user.id,
        end_date: endDate,
        reason,
        notes: notes ?? null,
        refund_amount: refundAmount,
        refund_currency: placement.salary_currency ?? "SEK",
    }).select("id").single();

    if (error) {
        if (error.code === "23505") return NextResponse.json({ error: "A breach report already exists for this placement" }, { status: 409 });
        return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }

    const candidate = Array.isArray(placement.candidate) ? placement.candidate[0] : placement.candidate;
    const job = Array.isArray(placement.job) ? placement.job[0] : placement.job;
    const name = candidate ? `${candidate.first_name} ${candidate.last_name}` : "kandidaten";
    const jobTitle = (job as any)?.title ?? "uppdraget";

    // Notify admins
    const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
    for (const adm of (admins ?? [])) {
        await createNotification(adm.id, {
            titleKey: "notif.newBreachReportedTitle",
            bodyKey: "notif.newBreachReportedBody",
            params: { name, jobTitle, amount: refundAmount, currency: placement.salary_currency ?? "SEK" },
            link: "/admin/guarantees",
        });
    }

    return NextResponse.json({ ok: true, reportId: report.id, refundAmount });
}
