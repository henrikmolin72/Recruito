import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";

export async function POST(request: NextRequest) {
  try {
    const { placementId } = await request.json();

    if (!placementId) {
      return NextResponse.json(
        { error: "placement_id krävs" },
        { status: 400 }
      );
    }

    // Fetch the placement
    const { data: placement, error: placementError } = await supabaseAdmin
      .from("placements")
      .select("*, recruiters ( stripe_connect_id )")
      .eq("id", placementId)
      .single();

    if (placementError || !placement) {
      return NextResponse.json(
        { error: "Placeringen hittades inte" },
        { status: 404 }
      );
    }

    // Verify placement is in guarantee_active state
    if (placement.status !== "guarantee_active") {
      return NextResponse.json(
        { error: "Placeringen måste vara i garantiperiod för utbetalning" },
        { status: 400 }
      );
    }

    // Verify guarantee period has ended
    const guaranteeEndDate = new Date(placement.guarantee_end_date);
    const now = new Date();
    if (now < guaranteeEndDate) {
      return NextResponse.json(
        {
          error: `Garantiperioden har inte löpt ut ännu. Slutdatum: ${guaranteeEndDate.toISOString().split("T")[0]}`,
        },
        { status: 400 }
      );
    }

    // Get recruiter's Stripe Connect account
    const stripeConnectId = (placement.recruiters as any)?.stripe_connect_id;
    if (!stripeConnectId) {
      return NextResponse.json(
        { error: "Rekryteraren har inget kopplat Stripe-konto" },
        { status: 400 }
      );
    }

    // Create Stripe Transfer to recruiter's connected account
    const transfer = await stripe.transfers.create({
      amount: Math.round(placement.recruiter_fee * 100), // Convert to öre
      currency: (placement.salary_currency || "sek").toLowerCase(),
      destination: stripeConnectId,
      metadata: {
        placement_id: placementId,
        recruiter_id: placement.recruiter_id,
      },
      description: `Utbetalning för placering ${placementId}`,
    });

    // Update placement status to payout_released
    await supabaseAdmin
      .from("placements")
      .update({
        status: "payout_released",
        stripe_payout_id: transfer.id,
        payout_released_at: new Date().toISOString(),
      })
      .eq("id", placementId);

    return NextResponse.json({
      success: true,
      transferId: transfer.id,
      amount: placement.recruiter_fee,
    });
  } catch (error) {
    console.error("Payout error:", error);
    return NextResponse.json(
      { error: "Kunde inte genomföra utbetalning" },
      { status: 500 }
    );
  }
}
