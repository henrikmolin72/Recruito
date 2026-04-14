/**
 * POST /api/guarantee/breach
 * Company-initiated guarantee breach report.
 * Admin is notified and must approve/reject the refund.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/actions/notifications";

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
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload", issues: parsed.success }, { status: 400 });

    const { placementId, endDate, reason, notes } = parsed.data;
    const admin = createAdminClient();

    // Verify company ownership
    const { data: company } = await admin.from("companies").select("id").eq("user_id", user.id).single();
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 403 });

    const { data: placement } = await admin
        .from("placements")
        .select("id, company_id, total_fee, salary_currency, guarantee_end_date, status, candidate:candidates(first_name, last_name), job:jobs(title)")
        .eq("id", placementId)
        .eq("company_id", company.id)
        .single();

    if (!placement) return NextResponse.json({ error: "Placement not found" }, { status: 404 });
    if (!["guarantee_active", "payout_released"].includes(placement.status)) {
        return NextResponse.json({ error: "Placement is not in an active guarantee period" }, { status: 400 });
    }

    // Calculate proportional refund
    let refundAmount = placement.total_fee;
    if (placement.guarantee_end_date) {
        const today = new Date();
        const end = new Date(placement.guarantee_end_date);
        // Assume guarantee started total_fee days before end (approximation)
        // More accurate: start = hired_at, but we use end - 30d as fallback
        const start = new Date(end);
        start.setDate(start.getDate() - 30);
        const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const remainingFraction = remainingDays / totalDays;
        refundAmount = Math.round(placement.total_fee * remainingFraction);
    }

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
        await createNotification(
            adm.id,
            "Nytt garantibrott rapporterat",
            `${name} (${jobTitle}) — möjlig återbetalning: ${refundAmount} ${placement.salary_currency ?? "SEK"}. Granska och godkänn.`,
            "/admin/placements"
        );
    }

    return NextResponse.json({ ok: true, reportId: report.id, refundAmount });
}
