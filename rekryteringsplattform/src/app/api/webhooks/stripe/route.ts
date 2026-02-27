import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const placementId = session.metadata?.placement_id;
      if (!placementId) break;

      if (session.payment_status === "paid") {
        // Update placement to guarantee_active
        await supabaseAdmin
          .from("placements")
          .update({
            status: "guarantee_active",
            payment_received_at: new Date().toISOString(),
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id || session.id,
          })
          .eq("id", placementId);

        // Update candidate status to guarantee_tracking
        const { data: placement } = await supabaseAdmin
          .from("placements")
          .select("candidate_id, job_id, recruiter_id")
          .eq("id", placementId)
          .single();

        if (placement) {
          await supabaseAdmin
            .from("candidates")
            .update({
              status: "guarantee_tracking",
              status_changed_at: new Date().toISOString(),
            })
            .eq("id", placement.candidate_id);

          // Notify recruiter that payment was received
          const { data: recruiter } = await supabaseAdmin
            .from("recruiters")
            .select("user_id")
            .eq("id", placement.recruiter_id)
            .single();

          if (recruiter) {
            await supabaseAdmin.from("notifications").insert({
              user_id: recruiter.user_id,
              title: "Betalning mottagen!",
              body: "Företaget har betalat rekryteringsavgiften. Garantiperioden har startat (90 dagar).",
              link: "/recruiter/earnings",
            });
          }
        }
      }
      break;
    }

    case "account.updated": {
      // Stripe Connect: recruiter completed onboarding
      const account = event.data.object as Stripe.Account;
      if (account.charges_enabled && account.payouts_enabled) {
        await supabaseAdmin
          .from("recruiters")
          .update({ stripe_onboarding_complete: true })
          .eq("stripe_connect_id", account.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
