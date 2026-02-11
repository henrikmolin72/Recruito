import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Stripe-signatur saknas" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Ogiltig webhook-signatur" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const placementId = invoice.metadata?.placement_id;

        if (placementId) {
          await getSupabaseAdmin()
            .from("placements")
            .update({
              status: "guarantee_active",
              payment_received_at: new Date().toISOString(),
            })
            .eq("id", placementId);
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const recruiterId = account.metadata?.recruiter_id;

        if (recruiterId) {
          const isOnboarded =
            account.charges_enabled && account.payouts_enabled;

          await getSupabaseAdmin()
            .from("recruiters")
            .update({
              stripe_onboarding_complete: isOnboarded,
            })
            .eq("id", recruiterId);
        } else {
          // Fallback: look up recruiter by stripe_connect_id
          await getSupabaseAdmin()
            .from("recruiters")
            .update({
              stripe_onboarding_complete:
                account.charges_enabled && account.payouts_enabled,
            })
            .eq("stripe_connect_id", account.id);
        }
        break;
      }

      default:
        // Unhandled event type - log but don't error
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook-hantering misslyckades" },
      { status: 500 }
    );
  }
}
