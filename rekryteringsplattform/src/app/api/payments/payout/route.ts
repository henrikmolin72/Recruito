import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    // Verify admin role
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { placementId } = await req.json();
    if (!placementId) {
      return NextResponse.json(
        { error: "placementId is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: placement, error: placementError } = await supabaseAdmin
      .from("placements")
      .select(
        `
        *,
        recruiter:recruiters(stripe_connect_id, user_id)
      `
      )
      .eq("id", placementId)
      .single();

    if (placementError || !placement) {
      return NextResponse.json(
        { error: "Placement not found" },
        { status: 404 }
      );
    }

    if (
      placement.status !== "guarantee_active" &&
      placement.status !== "payment_received"
    ) {
      return NextResponse.json(
        { error: "Placement is not in a payable state for payout" },
        { status: 400 }
      );
    }

    // Check guarantee period has ended
    if (new Date(placement.guarantee_end_date) > new Date()) {
      return NextResponse.json(
        { error: "Guarantee period has not ended yet" },
        { status: 400 }
      );
    }

    const recruiter = Array.isArray(placement.recruiter)
      ? placement.recruiter[0]
      : placement.recruiter;

    if (!recruiter?.stripe_connect_id) {
      return NextResponse.json(
        {
          error:
            "Recruiter has not completed Stripe onboarding. Cannot process payout.",
        },
        { status: 400 }
      );
    }

    // Create transfer to recruiter's connected account
    const transfer = await stripe.transfers.create({
      amount: placement.recruiter_fee * 100, // öre
      currency: (placement.salary_currency || "SEK").toLowerCase(),
      destination: recruiter.stripe_connect_id,
      metadata: { placement_id: placementId },
    });

    // Update placement
    await supabaseAdmin
      .from("placements")
      .update({
        status: "payout_released",
        stripe_payout_id: transfer.id,
        payout_released_at: new Date().toISOString(),
      })
      .eq("id", placementId);

    // Increment recruiter total_placements
    await supabaseAdmin.rpc("increment_recruiter_placements", {
      recruiter_id_input: placement.recruiter_id,
    });

    // Notify recruiter
    if (recruiter.user_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: recruiter.user_id,
        title: "Utbetalning genomförd!",
        body: `Din rekryteringsersättning på ${placement.recruiter_fee} ${placement.salary_currency || "SEK"} har betalats ut.`,
        link: "/recruiter/earnings",
      });
    }

    // Update candidate status to completed
    await supabaseAdmin
      .from("candidates")
      .update({
        status: "completed",
        status_changed_at: new Date().toISOString(),
      })
      .eq("id", placement.candidate_id);

    return NextResponse.json({ transferId: transfer.id });
  } catch (error: any) {
    console.error("Payout error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
